<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sync_logs', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignUuid('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('store_key', 120)->nullable();
            $table->string('status', 20);
            $table->unsignedBigInteger('json_size')->default(0);
            $table->text('message')->nullable();
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['store_id', 'synced_at']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sync_logs');
    }
};
