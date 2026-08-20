<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table): void {
            $table->unsignedInteger('max_products')->default(500)->after('max_users');
        });

        Schema::create('plans', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('slug', 50)->unique();
            $table->decimal('price_monthly', 10, 2)->default(0);
            $table->decimal('price_yearly', 10, 2)->default(0);
            $table->unsignedInteger('max_stores')->default(5);
            $table->unsignedInteger('max_users')->default(20);
            $table->unsignedInteger('max_products')->default(500);
            $table->jsonb('features')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['is_active', 'sort_order']);
        });

        Schema::create('subscriptions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('plan_id')->constrained('plans')->restrictOnDelete();
            $table->string('status', 30);
            $table->string('billing_interval', 20)->default('monthly');
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->boolean('auto_renew')->default(true);
            $table->timestamp('reminder_sent_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'status']);
            $table->index(['status', 'ends_at']);
        });

        Schema::create('payments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('subscription_id')->constrained('subscriptions')->cascadeOnDelete();
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3)->default('BYN');
            $table->string('status', 30);
            $table->string('payment_method', 30)->default('bank_transfer');
            $table->string('transaction_id')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->foreignUuid('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'status']);
            $table->index(['subscription_id', 'status']);
        });

        Schema::create('bank_accounts', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('account_name');
            $table->string('bank_name');
            $table->string('iban', 34);
            $table->string('unp', 20);
            $table->string('payment_purpose')->nullable();
            $table->boolean('is_default')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
        Schema::dropIfExists('subscriptions');
        Schema::dropIfExists('bank_accounts');
        Schema::dropIfExists('plans');

        Schema::table('tenants', function (Blueprint $table): void {
            $table->dropColumn('max_products');
        });
    }
};
