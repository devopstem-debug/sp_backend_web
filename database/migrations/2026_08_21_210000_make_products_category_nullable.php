<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE products ALTER COLUMN category DROP NOT NULL');
    }

    public function down(): void
    {
        DB::statement("UPDATE products SET category = 'Без категории' WHERE category IS NULL");
        DB::statement('ALTER TABLE products ALTER COLUMN category SET NOT NULL');
    }
};
