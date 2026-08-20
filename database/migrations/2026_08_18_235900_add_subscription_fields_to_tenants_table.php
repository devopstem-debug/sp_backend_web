<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table): void {
            $table->string('plan', 20)->default('basic')->after('domain');
            $table->date('subscription_until')->nullable()->after('plan');
            $table->unsignedInteger('max_stores')->default(5)->after('subscription_until');
            $table->unsignedInteger('max_users')->default(20)->after('max_stores');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table): void {
            $table->dropColumn(['plan', 'subscription_until', 'max_stores', 'max_users']);
        });
    }
};
