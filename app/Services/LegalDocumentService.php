<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\LegalDocument;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\Response;

class LegalDocumentService
{
    /**
     * @return Collection<int, LegalDocument>
     */
    public function all(): Collection
    {
        return LegalDocument::query()
            ->orderBy('type')
            ->orderByDesc('version')
            ->get();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): LegalDocument
    {
        $latest = LegalDocument::query()
            ->where('type', $data['type'])
            ->orderByDesc('version')
            ->value('version');

        $data['version'] = ((int) $latest) + 1;
        $data['is_active'] = false;

        return LegalDocument::query()->create($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(LegalDocument $document, array $data): LegalDocument
    {
        unset($data['type'], $data['version'], $data['is_active']);
        $document->update($data);

        return $document->refresh();
    }

    public function publish(LegalDocument $document): LegalDocument
    {
        LegalDocument::query()
            ->where('type', $document->type)
            ->whereKeyNot($document->id)
            ->update(['is_active' => false]);

        $document->update(['is_active' => true]);

        return $document->refresh();
    }

    public function published(string $type): ?LegalDocument
    {
        return LegalDocument::query()
            ->where('type', $type)
            ->where('is_active', true)
            ->orderByDesc('version')
            ->first();
    }

    public function downloadPdf(LegalDocument $document): Response
    {
        $pdf = Pdf::loadView('pdf.legal-document', [
            'document' => $document,
        ])->setPaper('a4');

        $filename = $document->type.'-v'.$document->version.'.pdf';

        return $pdf->download($filename);
    }

    /**
     * @return array<string, mixed>
     */
    public function toPayload(LegalDocument $document): array
    {
        return [
            'id' => $document->id,
            'type' => $document->type,
            'type_label' => $document->typeLabel(),
            'title' => $document->title,
            'content' => $document->content,
            'version' => $document->version,
            'is_active' => (bool) $document->is_active,
            'public_path' => $document->publicPath(),
            'updated_at' => $document->updated_at?->toIso8601String(),
        ];
    }
}
