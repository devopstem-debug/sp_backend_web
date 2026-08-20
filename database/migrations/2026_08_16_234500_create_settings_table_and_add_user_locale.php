<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            if (! Schema::hasColumn('users', 'locale')) {
                $table->string('locale', 5)->default('ru')->after('timezone');
            }
        });

        Schema::create('settings', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->nullable()->constrained('tenants')->cascadeOnDelete();
            $table->string('key', 100);
            $table->text('value')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('tenant_id');
            $table->index('key');
        });

        DB::statement("CREATE UNIQUE INDEX settings_tenant_key_active_unique ON settings ((COALESCE(tenant_id::text, 'global')), key) WHERE deleted_at IS NULL");
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');

        Schema::table('users', function (Blueprint $table): void {
            if (Schema::hasColumn('users', 'locale')) {
                $table->dropColumn('locale');
            }
        });
    }
};
