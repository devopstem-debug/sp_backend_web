<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\BankAccountFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class BankAccount extends Model
{
    /** @use HasFactory<BankAccountFactory> */
    use HasFactory, HasUuids, LogsActivity, SoftDeletes;

    protected $fillable = [
        'account_name',
        'bank_name',
        'iban',
        'unp',
        'payment_purpose',
        'is_default',
    ];

    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
        ];
    }

    public function purposeFor(Plan $plan, string $interval): string
    {
        $template = $this->payment_purpose ?: 'Оплата тарифа {plan} ({interval})';

        $intervalLabel = $interval === Subscription::INTERVAL_YEARLY ? 'год' : 'месяц';

        return strtr($template, [
            '{plan}' => $plan->name,
            '{interval}' => $intervalLabel,
            '{unp}' => $this->unp,
        ]);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontLogEmptyChanges();
    }
}
