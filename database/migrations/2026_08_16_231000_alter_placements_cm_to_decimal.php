<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE placements ALTER COLUMN start_cm TYPE numeric(8,2) USING start_cm::numeric(8,2)');
        DB::statement('ALTER TABLE placements ALTER COLUMN end_cm TYPE numeric(8,2) USING end_cm::numeric(8,2)');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE placements ALTER COLUMN start_cm TYPE integer USING ROUND(start_cm)::integer');
        DB::statement('ALTER TABLE placements ALTER COLUMN end_cm TYPE integer USING ROUND(end_cm)::integer');
    }
};
