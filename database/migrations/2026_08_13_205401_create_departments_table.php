<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('departments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('code', 10);
            $table->jsonb('name');
            $table->string('color', 7)->default('#CCCCCC');
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index('store_id');
        });

        DB::statement('CREATE UNIQUE INDEX departments_store_id_code_active_unique ON departments (store_id, code) WHERE deleted_at IS NULL');
    }

    public function down(): void
    {
        Schema::dropIfExists('departments');
    }
};
