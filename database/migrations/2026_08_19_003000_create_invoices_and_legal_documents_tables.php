<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('invoice_number')->unique();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('subscription_id')->constrained('subscriptions')->restrictOnDelete();
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3)->default('BYN');
            $table->date('period_start');
            $table->date('period_end');
            $table->string('status', 20)->default('draft');
            $table->string('pdf_path')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'status']);
            $table->index(['status', 'created_at']);
        });

        Schema::create('legal_documents', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('type', 50);
            $table->string('title');
            $table->text('content');
            $table->unsignedInteger('version')->default(1);
            $table->boolean('is_active')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['type', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('legal_documents');
    }
};
