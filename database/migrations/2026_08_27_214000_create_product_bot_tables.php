<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_bot_jobs', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('product_id')->constrained('products')->cascadeOnDelete();
            $table->string('status', 32)->default('pending')->index();
            $table->string('suggested_name')->nullable();
            $table->string('suggested_category')->nullable();
            $table->string('suggested_package_type', 50)->nullable();
            $table->unsignedInteger('suggested_width_mm')->nullable();
            $table->unsignedInteger('suggested_height_mm')->nullable();
            $table->unsignedInteger('suggested_depth_mm')->nullable();
            $table->unsignedInteger('suggested_volume_ml')->nullable();
            $table->unsignedTinyInteger('confidence')->default(0);
            $table->string('source', 32)->nullable();
            $table->text('reason')->nullable();
            $table->foreignUuid('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['product_id', 'status']);
        });

        Schema::create('product_bot_training_rules', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('keyword')->nullable()->index();
            $table->unsignedInteger('volume_ml_min')->nullable();
            $table->unsignedInteger('volume_ml_max')->nullable();
            $table->string('package_type', 50);
            $table->unsignedInteger('width_mm')->nullable();
            $table->unsignedInteger('height_mm')->nullable();
            $table->unsignedInteger('depth_mm')->nullable();
            $table->unsignedSmallInteger('priority')->default(100);
            $table->boolean('is_active')->default(true)->index();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_bot_training_rules');
        Schema::dropIfExists('product_bot_jobs');
    }
};
