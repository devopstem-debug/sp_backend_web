<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\ProductBotJob;
use App\Models\ProductBotTrainingRule;
use App\Services\ProductBotService;
use App\Support\ProductPackageTypes;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;
use Throwable;

class ProductBotController extends Controller
{
    public function __construct(
        private readonly ProductBotService $bot,
    ) {}

    public function index(Request $request): Response
    {
        $this->ensureSuperAdmin();

        $status = $request->string('status')->toString();
        if (! in_array($status, ['pending', 'accepted', 'rejected', 'all'], true)) {
            $status = 'pending';
        }

        $jobs = ProductBotJob::query()
            ->with(['product:id,barcode,name,category,package_type,volume_ml,width_mm,height_mm,depth_mm,checked'])
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->latest()
            ->paginate(20)
            ->withQueryString();

        $rules = ProductBotTrainingRule::query()
            ->latest()
            ->limit(100)
            ->get();

        return Inertia::render('ProductBot/Index', [
            'jobs' => $jobs,
            'rules' => $rules,
            'stats' => $this->bot->stats(),
            'packageTypes' => ProductPackageTypes::all(),
            'filters' => [
                'status' => $status,
            ],
        ]);
    }

    public function scan(): RedirectResponse
    {
        $this->ensureSuperAdmin();

        try {
            Artisan::call('products:bot-scan', ['--limit' => 50]);
            $output = trim(Artisan::output());

            return redirect()
                ->route('product-bot.index')
                ->with('success', $output !== '' ? $output : 'Сканирование завершено.');
        } catch (Throwable $exception) {
            report($exception);

            return redirect()
                ->route('product-bot.index')
                ->with('error', 'Не удалось запустить сканирование: '.$exception->getMessage());
        }
    }

    public function accept(Request $request, ProductBotJob $job): RedirectResponse
    {
        $this->ensureSuperAdmin();
        $user = Auth::user();

        $request->merge([
            'width_mm' => $request->filled('width_mm') ? $request->input('width_mm') : null,
            'height_mm' => $request->filled('height_mm') ? $request->input('height_mm') : null,
            'depth_mm' => $request->filled('depth_mm') ? $request->input('depth_mm') : null,
            'volume_ml' => $request->filled('volume_ml') ? $request->input('volume_ml') : null,
            'package_type' => $request->filled('package_type') ? $request->input('package_type') : null,
            'mark_checked' => $request->boolean('mark_checked'),
            'save_as_training' => $request->boolean('save_as_training'),
        ]);

        try {
            $data = $request->validate([
                'name' => ['nullable', 'string', 'max:255'],
                'category' => ['nullable', 'string', 'max:255'],
                'package_type' => ['nullable', 'string', 'max:50'],
                'width_mm' => ['nullable', 'integer', 'min:1', 'max:5000'],
                'height_mm' => ['nullable', 'integer', 'min:1', 'max:5000'],
                'depth_mm' => ['nullable', 'integer', 'min:1', 'max:5000'],
                'volume_ml' => ['nullable', 'integer', 'min:1', 'max:100000'],
                'mark_checked' => ['sometimes', 'boolean'],
                'save_as_training' => ['sometimes', 'boolean'],
                'training_name' => ['nullable', 'string', 'max:255'],
                'training_keyword' => ['nullable', 'string', 'max:255'],
            ]);
        } catch (ValidationException $exception) {
            throw $exception->redirectTo(route('product-bot.index', ['status' => 'pending']));
        }

        try {
            $this->bot->accept($job, $data, (string) $user->id);

            return $this->redirectToBotIndex('pending')
                ->with('success', 'Предложение принято, товар обновлён.');
        } catch (InvalidArgumentException $exception) {
            return $this->redirectToBotIndex()->with('error', $exception->getMessage());
        } catch (Throwable $exception) {
            report($exception);

            return $this->redirectToBotIndex()->with('error', 'Не удалось принять предложение.');
        }
    }

    public function reject(Request $request, ProductBotJob $job): RedirectResponse
    {
        $this->ensureSuperAdmin();
        $user = Auth::user();

        try {
            $this->bot->reject($job, (string) $user->id);

            return $this->redirectToBotIndex('pending')
                ->with('success', 'Предложение отклонено.');
        } catch (InvalidArgumentException $exception) {
            return $this->redirectToBotIndex()->with('error', $exception->getMessage());
        }
    }

    public function storeRule(Request $request): RedirectResponse
    {
        $this->ensureSuperAdmin();
        $user = Auth::user();

        $request->merge([
            'volume_ml_min' => $request->filled('volume_ml_min') ? $request->input('volume_ml_min') : null,
            'volume_ml_max' => $request->filled('volume_ml_max') ? $request->input('volume_ml_max') : null,
            'width_mm' => $request->filled('width_mm') ? $request->input('width_mm') : null,
            'height_mm' => $request->filled('height_mm') ? $request->input('height_mm') : null,
            'depth_mm' => $request->filled('depth_mm') ? $request->input('depth_mm') : null,
            'is_active' => $request->boolean('is_active', true),
        ]);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'keyword' => ['nullable', 'string', 'max:255'],
            'volume_ml_min' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'volume_ml_max' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'package_type' => ['required', 'string', 'max:50'],
            'width_mm' => ['nullable', 'integer', 'min:1', 'max:5000'],
            'height_mm' => ['nullable', 'integer', 'min:1', 'max:5000'],
            'depth_mm' => ['nullable', 'integer', 'min:1', 'max:5000'],
            'priority' => ['nullable', 'integer', 'min:1', 'max:1000'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        try {
            $this->bot->storeTrainingRule($data, (string) $user->id);

            return $this->redirectToBotIndex()
                ->with('success', 'Правило обучения сохранено.');
        } catch (InvalidArgumentException $exception) {
            return $this->redirectToBotIndex()->with('error', $exception->getMessage());
        }
    }

    public function destroyRule(ProductBotTrainingRule $rule): RedirectResponse
    {
        $this->ensureSuperAdmin();

        $this->bot->deleteTrainingRule($rule);

        return $this->redirectToBotIndex()->with('success', 'Правило удалено.');
    }

    private function ensureSuperAdmin(): void
    {
        abort_unless(Auth::user()?->isSuperAdmin() === true, 403, 'Доступ только для Super Admin.');
    }

    private function redirectToBotIndex(?string $status = null): RedirectResponse
    {
        $status ??= (string) request()->input('status', 'pending');
        if (! in_array($status, ['pending', 'accepted', 'rejected', 'all'], true)) {
            $status = 'pending';
        }

        return redirect()->route('product-bot.index', ['status' => $status]);
    }
}
