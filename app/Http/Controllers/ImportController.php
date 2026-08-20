<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Tenant;
use App\Services\NotificationService;
use App\Services\ProductImportService;
use App\Support\Permissions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ImportController extends Controller implements HasMiddleware
{
    /**
     * @return list<Middleware>
     */
    public static function middleware(): array
    {
        return [
            new Middleware('permission:'.Permissions::IMPORT_PRODUCTS),
        ];
    }
    public function __construct(
        private readonly ProductImportService $imports,
        private readonly NotificationService $notifications,
    ) {}

    public function index(Request $request): Response
    {
        return Inertia::render('Import/Index', [
            'result' => $request->session()->get('importResult'),
        ]);
    }

    public function upload(Request $request): RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:10240'],
        ], [
            'file.required' => 'Выберите CSV-файл.',
            'file.mimes' => 'Допустимы только файлы CSV/TXT.',
            'file.max' => 'Размер файла не должен превышать 10 МБ.',
        ]);

        /** @var \Illuminate\Http\UploadedFile $file */
        $file = $request->file('file');
        $tenantId = $this->resolveTenantId();
        $result = $this->imports->import($file, $tenantId);

        $message = sprintf(
            'Импорт завершён: создано %d, обновлено %d, ошибок %d.',
            $result['created'],
            $result['updated'],
            $result['errors'],
        );

        $this->notifications->notify(
            $tenantId,
            $result['errors'] > 0 ? 'warning' : 'success',
            'Импорт завершён',
            sprintf(
                'Импорт завершён: %d создано, %d обновлено, %d ошибки',
                $result['created'],
                $result['updated'],
                $result['errors'],
            ),
            Auth::id(),
            '/import',
        );

        return redirect()
            ->route('import.index')
            ->with('success', $message)
            ->with('importResult', $result);
    }

    public function downloadTemplate(): StreamedResponse
    {
        $csv = $this->imports->templateCsv();

        return response()->streamDownload(
            static function () use ($csv): void {
                echo $csv;
            },
            'products-import-template.csv',
            [
                'Content-Type' => 'text/csv; charset=UTF-8',
            ],
        );
    }

    private function resolveTenantId(): string
    {
        $user = Auth::user();

        if ($user?->tenant_id) {
            return $user->tenant_id;
        }

        abort_unless($user?->isSuperAdmin() === true, 403, 'Tenant is not assigned to your account.');

        $tenantId = Tenant::query()->where('is_active', true)->value('id');

        abort_unless($tenantId, 422, 'Нет активного арендатора для импорта товаров.');

        return $tenantId;
    }
}
