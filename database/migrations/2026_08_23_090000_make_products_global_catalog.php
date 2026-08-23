<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table): void {
            $table->foreignUuid('owner_tenant_id')
                ->nullable()
                ->after('tenant_id')
                ->constrained('tenants')
                ->nullOnDelete();

            $table->index('owner_tenant_id');
        });

        // Existing barcodes are already globally unique — promote to shared catalog.
        DB::table('products')->update(['owner_tenant_id' => null]);

        Schema::table('products', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table): void {
            $table->foreignUuid('tenant_id')
                ->nullable()
                ->after('id')
                ->constrained('tenants')
                ->cascadeOnDelete();
        });

        DB::statement('
            UPDATE products
            SET tenant_id = owner_tenant_id
            WHERE owner_tenant_id IS NOT NULL
        ');

        // Fallback for global rows so down() does not leave NULL if column was NOT NULL historically.
        $fallbackTenantId = DB::table('tenants')->orderBy('created_at')->value('id');

        if ($fallbackTenantId) {
            DB::table('products')
                ->whereNull('tenant_id')
                ->update(['tenant_id' => $fallbackTenantId]);
        }

        Schema::table('products', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('owner_tenant_id');
        });
    }
};
