<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\Invoice;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class InvoiceIssuedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Invoice $invoice,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Счёт '.$this->invoice->invoice_number.' — Smart Planogram',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.invoice-issued',
            with: [
                'invoice' => $this->invoice,
                'tenant' => $this->invoice->tenant,
            ],
        );
    }

    /**
     * @return list<Attachment>
     */
    public function attachments(): array
    {
        $path = $this->invoice->pdf_path;

        if (! $path || ! Storage::disk('local')->exists($path)) {
            return [];
        }

        return [
            Attachment::fromStorageDisk('local', $path)
                ->as($this->invoice->invoice_number.'.pdf')
                ->withMime('application/pdf'),
        ];
    }
}
