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
            $table->json('geo_polygon')->nullable()->after('origin');
            $table->decimal('geo_center_lat', 10, 7)->nullable()->after('geo_polygon');
            $table->decimal('geo_center_lng', 10, 7)->nullable()->after('geo_center_lat');
            $table->string('geo_address')->nullable()->after('geo_center_lng');
            $table->decimal('area_sqm_geo', 12, 2)->nullable()->after('geo_address');
            $table->decimal('bearing_degrees', 6, 2)->nullable()->after('area_sqm_geo');
        });
    }

    public function down(): void
    {
        Schema::table('store_layouts', function (Blueprint $table): void {
            $table->dropColumn([
                'geo_polygon',
                'geo_center_lat',
                'geo_center_lng',
                'geo_address',
                'area_sqm_geo',
                'bearing_degrees',
            ]);
        });
    }
};
