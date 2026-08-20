<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shelves', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignUuid('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->string('code', 20);
            $table->jsonb('name');
            $table->unsignedInteger('width_cm')->default(120);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index('store_id');
            $table->index('department_id');
            $table->index('code');
        });

        DB::statement('CREATE UNIQUE INDEX shelves_store_id_code_active_unique ON shelves (store_id, code) WHERE deleted_at IS NULL');
    }

    public function down(): void
    {
        Schema::dropIfExists('shelves');
    }
};
