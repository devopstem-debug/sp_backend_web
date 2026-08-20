<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shelves', function (Blueprint $table): void {
            if (! Schema::hasColumn('shelves', 'width_mm')) {
                $table->unsignedInteger('width_mm')->default(1500)->after('name');
            }
            if (! Schema::hasColumn('shelves', 'height_mm')) {
                $table->unsignedInteger('height_mm')->default(1600)->after('width_mm');
            }
            if (! Schema::hasColumn('shelves', 'depth_mm')) {
                $table->unsignedInteger('depth_mm')->default(700)->after('height_mm');
            }
            if (! Schema::hasColumn('shelves', 'shelf_count')) {
                $table->unsignedTinyInteger('shelf_count')->default(5)->after('depth_mm');
            }
        });

        if (Schema::hasColumn('shelves', 'width_cm')) {
            DB::statement('UPDATE shelves SET width_mm = COALESCE(width_cm, 120) * 10 WHERE width_mm = 1500 AND width_cm IS NOT NULL AND width_cm <> 150');
            DB::statement('UPDATE shelves SET width_cm = GREATEST(1, ROUND(width_mm / 10.0))');
        }

        Schema::table('shelf_levels', function (Blueprint $table): void {
            if (! Schema::hasColumn('shelf_levels', 'height_from_floor_mm')) {
                $table->unsignedInteger('height_from_floor_mm')->default(0)->after('level_number');
            }
            if (! Schema::hasColumn('shelf_levels', 'capacity_mm')) {
                $table->unsignedInteger('capacity_mm')->default(400)->after('height_from_floor_mm');
            }
        });

        if (Schema::hasColumn('shelf_levels', 'height_cm')) {
            DB::statement('UPDATE shelf_levels SET capacity_mm = GREATEST(1, height_cm * 10) WHERE capacity_mm = 400');
        }
    }

    public function down(): void
    {
        Schema::table('shelf_levels', function (Blueprint $table): void {
            if (Schema::hasColumn('shelf_levels', 'capacity_mm')) {
                $table->dropColumn('capacity_mm');
            }
            if (Schema::hasColumn('shelf_levels', 'height_from_floor_mm')) {
                $table->dropColumn('height_from_floor_mm');
            }
        });

        Schema::table('shelves', function (Blueprint $table): void {
            foreach (['shelf_count', 'depth_mm', 'height_mm', 'width_mm'] as $column) {
                if (Schema::hasColumn('shelves', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
