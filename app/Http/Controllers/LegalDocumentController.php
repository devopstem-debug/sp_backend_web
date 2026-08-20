<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\LegalDocumentRequest;
use App\Models\LegalDocument;
use App\Services\LegalDocumentService;
use App\Support\Permissions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class LegalDocumentController extends Controller implements HasMiddleware
{
    public function __construct(
        private readonly LegalDocumentService $documents,
    ) {}

    /**
     * @return list<Middleware>
     */
    public static function middleware(): array
    {
        return [
            new Middleware('permission:'.Permissions::MANAGE_LEGAL),
        ];
    }

    public function index(): InertiaResponse
    {
        return Inertia::render('Legal/Index', [
            'documents' => $this->documents->all()
                ->map(fn (LegalDocument $document) => $this->documents->toPayload($document))
                ->values()
                ->all(),
            'types' => collect(LegalDocument::typeLabels())
                ->map(fn (string $label, string $value) => ['value' => $value, 'label' => $label])
                ->values()
                ->all(),
        ]);
    }

    public function create(): InertiaResponse
    {
        return Inertia::render('Legal/Edit', [
            'document' => null,
            'types' => collect(LegalDocument::typeLabels())
                ->map(fn (string $label, string $value) => ['value' => $value, 'label' => $label])
                ->values()
                ->all(),
        ]);
    }

    public function store(LegalDocumentRequest $request): RedirectResponse
    {
        $document = $this->documents->create($request->documentAttributes());

        return redirect()
            ->route('admin.legal.edit', $document->id)
            ->with('success', 'Документ создан.');
    }

    public function edit(string $legal): InertiaResponse
    {
        $document = LegalDocument::query()->findOrFail($legal);

        return Inertia::render('Legal/Edit', [
            'document' => $this->documents->toPayload($document),
            'types' => collect(LegalDocument::typeLabels())
                ->map(fn (string $label, string $value) => ['value' => $value, 'label' => $label])
                ->values()
                ->all(),
        ]);
    }

    public function update(LegalDocumentRequest $request, string $legal): RedirectResponse
    {
        $document = LegalDocument::query()->findOrFail($legal);
        $this->documents->update($document, $request->documentAttributes());

        return back()->with('success', 'Документ сохранён.');
    }

    public function publish(string $legal): RedirectResponse
    {
        $document = LegalDocument::query()->findOrFail($legal);
        $this->documents->publish($document);

        return back()->with('success', 'Документ опубликован.');
    }

    public function downloadPdf(string $legal): Response|SymfonyResponse
    {
        $document = LegalDocument::query()->findOrFail($legal);

        return $this->documents->downloadPdf($document);
    }
}
