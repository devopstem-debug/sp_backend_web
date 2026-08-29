<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('store_layouts', function (Blueprint $table): void {
            $table->string('entrance_side', 16)->nullable()->after('grid_size_cm');
            $table->decimal('entrance_offset_m', 8, 2)->nullable()->after('entrance_side');
            $table->decimal('entrance_width_m', 8, 2)->nullable()->after('entrance_offset_m');
            $table->boolean('has_cash_registers')->default(false)->after('entrance_width_m');
            $table->string('cash_side', 16)->nullable()->after('has_cash_registers');
            $table->unsignedTinyInteger('cash_count')->default(0)->after('cash_side');
            $table->string('origin', 16)->default('sw')->after('cash_count');
        });
    }

    public function down(): void
    {
        Schema::table('store_layouts', function (Blueprint $table): void {
            $table->dropColumn([
                'entrance_side',
                'entrance_offset_m',
                'entrance_width_m',
                'has_cash_registers',
                'cash_side',
                'cash_count',
                'origin',
            ]);
        });
    }
};
