<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\LegalDocument;
use App\Services\LegalDocumentService;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class LegalPublicController extends Controller
{
    public function __construct(
        private readonly LegalDocumentService $documents,
    ) {}

    public function oferta(): Response
    {
        return $this->show(LegalDocument::TYPE_OFERTA, 'Публичная оферта');
    }

    public function privacy(): Response
    {
        return $this->show(LegalDocument::TYPE_PRIVACY, 'Политика конфиденциальности');
    }

    public function download(string $type): SymfonyResponse
    {
        abort_unless(in_array($type, LegalDocument::types(), true), 404);

        $document = $this->documents->published($type);
        abort_unless($document !== null, 404);

        return $this->documents->downloadPdf($document);
    }

    private function show(string $type, string $fallbackTitle): Response
    {
        $document = $this->documents->published($type);

        return Inertia::render('Legal/Public', [
            'title' => $document?->title ?? $fallbackTitle,
            'content' => $document?->content,
            'version' => $document?->version,
            'type' => $type,
            'downloadUrl' => $document ? route('legal.download', $type) : null,
        ]);
    }
}
