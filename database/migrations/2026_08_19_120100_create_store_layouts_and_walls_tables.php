<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('store_layouts', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('store_id')->constrained('stores')->cascadeOnDelete();
            $table->decimal('width_meters', 6, 2)->default(30);
            $table->decimal('height_meters', 6, 2)->default(25);
            $table->unsignedInteger('grid_size_cm')->default(50);
            $table->timestamps();

            $table->unique('store_id');
        });

        Schema::create('walls', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('store_id')->constrained('stores')->cascadeOnDelete();
            $table->decimal('start_x', 6, 2);
            $table->decimal('start_y', 6, 2);
            $table->decimal('end_x', 6, 2);
            $table->decimal('end_y', 6, 2);
            $table->string('wall_type', 20)->default('wall');
            $table->timestamps();

            $table->index('store_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('walls');
        Schema::dropIfExists('store_layouts');
    }
};
