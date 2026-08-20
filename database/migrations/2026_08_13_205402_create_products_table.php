<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('barcode', 13);
            $table->string('name');
            $table->string('category', 100);
            $table->unsignedInteger('volume_ml')->nullable();
            $table->string('package_type', 50)->nullable();
            $table->unsignedInteger('width_mm')->nullable();
            $table->unsignedInteger('height_mm')->nullable();
            $table->unsignedInteger('depth_mm')->nullable();
            $table->unsignedInteger('weight_g')->nullable();
            $table->boolean('checked')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->index('tenant_id');
            $table->index('barcode');
            $table->index('category');
        });

        DB::statement('CREATE UNIQUE INDEX products_barcode_active_unique ON products (barcode) WHERE deleted_at IS NULL');
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
