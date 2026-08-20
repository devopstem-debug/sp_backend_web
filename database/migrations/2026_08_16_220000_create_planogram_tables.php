<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('shelves')) {
            Schema::table('shelves', function (Blueprint $table): void {
                if (! Schema::hasColumn('shelves', 'code')) {
                    $table->string('code', 20)->default('SH-001')->after('department_id');
                }

                if (! Schema::hasColumn('shelves', 'width_cm')) {
                    $table->unsignedInteger('width_cm')->default(120)->after('name');
                }
            });

            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS shelves_store_id_code_active_unique ON shelves (store_id, code) WHERE deleted_at IS NULL');
        }

        if (! Schema::hasTable('shelf_levels')) {
            Schema::create('shelf_levels', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('shelf_id')->constrained('shelves')->cascadeOnDelete();
                $table->unsignedInteger('level_number');
                $table->unsignedInteger('height_cm')->default(40);
                $table->integer('sort_order')->default(0);
                $table->timestamps();
                $table->softDeletes();

                $table->index('shelf_id');
            });

            DB::statement('CREATE UNIQUE INDEX shelf_levels_shelf_id_level_number_active_unique ON shelf_levels (shelf_id, level_number) WHERE deleted_at IS NULL');
        }

        if (! Schema::hasTable('placements')) {
            Schema::create('placements', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('shelf_level_id')->constrained('shelf_levels')->cascadeOnDelete();
                $table->foreignUuid('product_id')->constrained('products')->cascadeOnDelete();
                $table->unsignedInteger('start_cm');
                $table->unsignedInteger('end_cm');
                $table->unsignedInteger('facings')->default(1);
                $table->timestamps();
                $table->softDeletes();

                $table->index('shelf_level_id');
                $table->index('product_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('placements');
        Schema::dropIfExists('shelf_levels');
    }
};
