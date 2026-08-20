<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="utf-8">
    <title>Счёт {{ $invoice->invoice_number }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #111; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background: #f3f4f6; }
        .muted { color: #555; }
        .totals { margin-top: 16px; font-size: 14px; }
    </style>
</head>
<body>
    <h1>Счёт на оплату {{ $invoice->invoice_number }}</h1>
    <p class="muted">Дата выставления: {{ $issuedAt }}</p>
    <p>
        <strong>Плательщик:</strong> {{ $tenant?->name }}<br>
        @if ($tenant?->domain)
            Домен: {{ $tenant->domain }}<br>
        @endif
        Период: {{ $invoice->period_start?->format('d.m.Y') }} — {{ $invoice->period_end?->format('d.m.Y') }}
    </p>

    @if ($bank)
        <p>
            <strong>Получатель:</strong> {{ $bank->account_name }}<br>
            Банк: {{ $bank->bank_name }}<br>
            IBAN: {{ $bank->iban }}<br>
            УНП: {{ $bank->unp }}<br>
            Назначение: {{ $bank->payment_purpose ?: ('Оплата счёта '.$invoice->invoice_number) }}
        </p>
    @endif

    <table>
        <thead>
            <tr>
                <th>Услуга</th>
                <th>Период</th>
                <th>Сумма</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Тариф {{ $plan?->name ?? 'Smart Planogram' }}</td>
                <td>{{ $invoice->period_start?->format('d.m.Y') }} — {{ $invoice->period_end?->format('d.m.Y') }}</td>
                <td>{{ number_format((float) $invoice->amount, 2, ',', ' ') }} {{ $invoice->currency }}</td>
            </tr>
        </tbody>
    </table>

    <p class="totals">
        <strong>К оплате: {{ number_format((float) $invoice->amount, 2, ',', ' ') }} {{ $invoice->currency }}</strong>
    </p>
    <p class="muted">НДС не облагается, если иное не указано в договоре.</p>
</body>
</html>
