<p>Здравствуйте!</p>
<p>
    Выставлен счёт <strong>{{ $invoice->invoice_number }}</strong>
    на сумму {{ number_format((float) $invoice->amount, 2, ',', ' ') }} {{ $invoice->currency }}
    для {{ $tenant?->name }}.
</p>
<p>
    Период: {{ $invoice->period_start?->format('d.m.Y') }} — {{ $invoice->period_end?->format('d.m.Y') }}.
</p>
<p>PDF-файл счёта приложен к письму.</p>
<p>Smart Planogram Control Center</p>
