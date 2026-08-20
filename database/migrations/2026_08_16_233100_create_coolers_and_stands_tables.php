<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('coolers', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignUuid('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->string('code', 20);
            $table->jsonb('display_name')->nullable();
            $table->unsignedInteger('width_mm')->default(1500);
            $table->unsignedInteger('height_mm')->default(2000);
            $table->unsignedInteger('depth_mm')->default(700);
            $table->unsignedTinyInteger('door_count')->default(2);
            $table->unsignedTinyInteger('shelf_count')->default(5);
            $table->string('temperature_zone', 50)->default('chilled');
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index('store_id');
            $table->index('department_id');
            $table->index('code');
        });

        DB::statement('CREATE UNIQUE INDEX coolers_store_id_code_active_unique ON coolers (store_id, code) WHERE deleted_at IS NULL');

        Schema::create('cooler_shelf_levels', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('cooler_id')->constrained('coolers')->cascadeOnDelete();
            $table->unsignedInteger('level_number');
            $table->unsignedInteger('height_from_floor_mm')->default(0);
            $table->unsignedInteger('capacity_mm')->default(400);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index('cooler_id');
        });

        DB::statement('CREATE UNIQUE INDEX cooler_shelf_levels_cooler_level_active_unique ON cooler_shelf_levels (cooler_id, level_number) WHERE deleted_at IS NULL');

        Schema::create('stands', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignUuid('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->string('code', 20);
            $table->jsonb('display_name')->nullable();
            $table->string('stand_type', 50)->default('gondola');
            $table->unsignedInteger('width_mm')->default(1000);
            $table->unsignedInteger('height_mm')->default(1600);
            $table->unsignedInteger('depth_mm')->default(600);
            $table->unsignedTinyInteger('shelf_count')->default(4);
            $table->boolean('has_back')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index('store_id');
            $table->index('department_id');
            $table->index('code');
        });

        DB::statement('CREATE UNIQUE INDEX stands_store_id_code_active_unique ON stands (store_id, code) WHERE deleted_at IS NULL');

        Schema::create('stand_shelf_levels', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('stand_id')->constrained('stands')->cascadeOnDelete();
            $table->unsignedInteger('level_number');
            $table->unsignedInteger('height_from_floor_mm')->default(0);
            $table->unsignedInteger('capacity_mm')->default(400);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index('stand_id');
        });

        DB::statement('CREATE UNIQUE INDEX stand_shelf_levels_stand_level_active_unique ON stand_shelf_levels (stand_id, level_number) WHERE deleted_at IS NULL');
    }

    public function down(): void
    {
        Schema::dropIfExists('stand_shelf_levels');
        Schema::dropIfExists('stands');
        Schema::dropIfExists('cooler_shelf_levels');
        Schema::dropIfExists('coolers');
    }
};
