<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['shelves', 'coolers', 'stands'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName): void {
                if (! Schema::hasColumn($tableName, 'pos_x')) {
                    $table->decimal('pos_x', 6, 2)->default(0)->after('sort_order');
                }

                if (! Schema::hasColumn($tableName, 'pos_y')) {
                    $table->decimal('pos_y', 6, 2)->default(0)->after('pos_x');
                }

                if (! Schema::hasColumn($tableName, 'rotation')) {
                    $table->smallInteger('rotation')->default(0)->after('pos_y');
                }
            });
        }
    }

    public function down(): void
    {
        foreach (['shelves', 'coolers', 'stands'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName): void {
                if (Schema::hasColumn($tableName, 'rotation')) {
                    $table->dropColumn('rotation');
                }

                if (Schema::hasColumn($tableName, 'pos_y')) {
                    $table->dropColumn('pos_y');
                }

                if (Schema::hasColumn($tableName, 'pos_x')) {
                    $table->dropColumn('pos_x');
                }
            });
        }
    }
};
