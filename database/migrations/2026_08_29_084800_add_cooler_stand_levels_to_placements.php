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
        Schema::table('placements', function (Blueprint $table): void {
            $table->foreignUuid('cooler_shelf_level_id')
                ->nullable()
                ->after('shelf_level_id')
                ->constrained('cooler_shelf_levels')
                ->cascadeOnDelete();
            $table->foreignUuid('stand_shelf_level_id')
                ->nullable()
                ->after('cooler_shelf_level_id')
                ->constrained('stand_shelf_levels')
                ->cascadeOnDelete();

            $table->index('cooler_shelf_level_id');
            $table->index('stand_shelf_level_id');
        });

        // Allow shelf-only OR cooler-only OR stand-only placements.
        DB::statement('ALTER TABLE placements ALTER COLUMN shelf_level_id DROP NOT NULL');
    }

    public function down(): void
    {
        DB::statement('DELETE FROM placements WHERE shelf_level_id IS NULL');
        DB::statement('ALTER TABLE placements ALTER COLUMN shelf_level_id SET NOT NULL');

        Schema::table('placements', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('cooler_shelf_level_id');
            $table->dropConstrainedForeignId('stand_shelf_level_id');
        });
    }
};
