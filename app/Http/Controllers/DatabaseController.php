<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\ExecuteSqlRequest;
use App\Services\DatabaseDumpService;
use App\Services\DatabaseViewerService;
use App\Support\Permissions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class DatabaseController extends Controller implements HasMiddleware
{
    public function __construct(
        private readonly DatabaseViewerService $databaseViewer,
        private readonly DatabaseDumpService $databaseDump,
    ) {}

    /**
     * @return list<Middleware>
     */
    public static function middleware(): array
    {
        return [
            new Middleware('permission:'.Permissions::MANAGE_DATABASE),
        ];
    }

    public function index(): Response
    {
        $user = Auth::user();

        return Inertia::render('Database/Index', [
            'tables' => $this->databaseViewer->tablesWithCounts(),
            'canExportSql' => $user?->isSuperAdmin() === true,
            'driver' => (string) config('database.default'),
        ]);
    }

    public function exportSql(): StreamedResponse|RedirectResponse
    {
        $user = Auth::user();

        abort_unless($user?->isSuperAdmin() === true, 403, 'Экспорт SQL доступен только Super Admin.');

        try {
            activity()
                ->causedBy($user)
                ->withProperties([
                    'driver' => config('database.default'),
                    'action' => 'database_sql_export',
                ])
                ->log('Экспорт всей БД в SQL');

            return $this->databaseDump->downloadSqlDump();
        } catch (Throwable $exception) {
            report($exception);

            return redirect()
                ->route('database.index')
                ->with('error', $exception->getMessage());
        }
    }

    public function show(Request $request, string $table): Response
    {
        try {
            $this->databaseViewer->assertTableAllowed($table);
        } catch (InvalidArgumentException $exception) {
            abort(404, $exception->getMessage());
        }

        $search = $request->string('search')->toString();
        $sort = $request->string('sort')->toString();
        $direction = $request->string('direction')->toString();
        $columns = $this->databaseViewer->columns($table);
        $effectiveSort = in_array($sort, $columns, true)
            ? $sort
            : (in_array('created_at', $columns, true) ? 'created_at' : ($columns[0] ?? 'id'));
        $effectiveDirection = strtolower($direction) === 'desc' ? 'desc' : 'asc';

        $records = $this->databaseViewer->paginateTable(
            $table,
            $search !== '' ? $search : null,
            $effectiveSort,
            $effectiveDirection,
        );

        return Inertia::render('Database/Show', [
            'table' => $table,
            'columns' => $columns,
            'records' => $records,
            'filters' => [
                'search' => $search,
                'sort' => $effectiveSort,
                'direction' => $effectiveDirection,
            ],
        ]);
    }

    public function sql(Request $request): Response
    {
        return Inertia::render('Database/Sql', [
            'query' => $request->string('query')->toString(),
            'result' => [
                'columns' => [],
                'rows' => [],
                'row_count' => 0,
            ],
        ]);
    }

    public function executeSql(ExecuteSqlRequest $request): RedirectResponse|Response
    {
        $sql = $request->validated('query');

        try {
            $result = $this->databaseViewer->executeSelect($sql);
        } catch (InvalidArgumentException|RuntimeException $exception) {
            return back()
                ->withInput()
                ->with('error', $exception->getMessage());
        }

        return Inertia::render('Database/Sql', [
            'query' => $sql,
            'result' => $result,
        ]);
    }
}
