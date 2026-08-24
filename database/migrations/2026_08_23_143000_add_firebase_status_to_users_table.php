<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->timestamp('firebase_synced_at')->nullable()->after('firebase_uid');
            $table->string('firebase_status', 20)->default('pending')->after('firebase_synced_at');

            $table->index('firebase_status');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropIndex(['firebase_status']);
            $table->dropColumn(['firebase_synced_at', 'firebase_status']);
        });
    }
};
