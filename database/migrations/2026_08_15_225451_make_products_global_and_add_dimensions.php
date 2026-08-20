<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('products')) {
            return;
        }

        Schema::table('products', function (Blueprint $table): void {
            if (Schema::hasColumn('products', 'store_id')) {
                $table->dropConstrainedForeignId('store_id');
            }

            if (! Schema::hasColumn('products', 'volume_ml')) {
                $table->unsignedInteger('volume_ml')->nullable()->after('category');
            }

            if (! Schema::hasColumn('products', 'package_type')) {
                $table->string('package_type', 50)->nullable()->after('volume_ml');
            }

            if (! Schema::hasColumn('products', 'width_mm')) {
                $table->unsignedInteger('width_mm')->nullable()->after('package_type');
            }

            if (! Schema::hasColumn('products', 'height_mm')) {
                $table->unsignedInteger('height_mm')->nullable()->after('width_mm');
            }

            if (! Schema::hasColumn('products', 'depth_mm')) {
                $table->unsignedInteger('depth_mm')->nullable()->after('height_mm');
            }

            if (! Schema::hasColumn('products', 'weight_g')) {
                $table->unsignedInteger('weight_g')->nullable()->after('depth_mm');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('products')) {
            return;
        }

        Schema::table('products', function (Blueprint $table): void {
            foreach (['volume_ml', 'package_type', 'width_mm', 'height_mm', 'depth_mm', 'weight_g'] as $column) {
                if (Schema::hasColumn('products', $column)) {
                    $table->dropColumn($column);
                }
            }

            if (! Schema::hasColumn('products', 'store_id')) {
                $table->foreignUuid('store_id')
                    ->nullable()
                    ->constrained('stores')
                    ->nullOnDelete();
            }
        });
    }
};
