<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('store_layout_markers', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('marker_type', 32);
            $table->string('code', 50);
            $table->decimal('pos_x', 8, 2)->default(0);
            $table->decimal('pos_y', 8, 2)->default(0);
            $table->unsignedSmallInteger('rotation')->default(0);
            $table->decimal('width_meters', 6, 2)->default(1);
            $table->decimal('depth_meters', 6, 2)->default(1);
            $table->string('color', 20)->nullable();
            $table->timestamps();

            $table->index(['store_id', 'marker_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('store_layout_markers');
    }
};
