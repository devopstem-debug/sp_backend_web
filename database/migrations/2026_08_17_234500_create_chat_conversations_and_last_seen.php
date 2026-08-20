<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->timestamp('last_seen_at')->nullable()->after('last_login_at');
        });

        Schema::create('chat_conversations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('type', 20);
            $table->string('direct_key')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'direct_key']);
            $table->index(['tenant_id', 'type']);
        });

        DB::statement("
            CREATE UNIQUE INDEX chat_conversations_one_general_per_tenant
            ON chat_conversations (tenant_id)
            WHERE type = 'general' AND deleted_at IS NULL
        ");

        Schema::create('chat_conversation_user', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('conversation_id')->constrained('chat_conversations')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('last_read_at')->nullable();
            $table->timestamps();

            $table->unique(['conversation_id', 'user_id']);
        });

        DB::statement('ALTER TABLE chat_conversation_user ALTER COLUMN id SET DEFAULT gen_random_uuid()');

        Schema::table('chat_messages', function (Blueprint $table): void {
            $table->foreignUuid('conversation_id')
                ->nullable()
                ->after('tenant_id')
                ->constrained('chat_conversations')
                ->cascadeOnDelete();
        });

        $this->backfillGeneralConversations();
    }

    public function down(): void
    {
        Schema::table('chat_messages', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('conversation_id');
        });

        Schema::dropIfExists('chat_conversation_user');
        Schema::dropIfExists('chat_conversations');

        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('last_seen_at');
        });
    }

    private function backfillGeneralConversations(): void
    {
        $tenantIds = DB::table('tenants')->whereNull('deleted_at')->pluck('id');

        foreach ($tenantIds as $tenantId) {
            $conversationId = (string) Str::uuid();
            $now = now();

            DB::table('chat_conversations')->insert([
                'id' => $conversationId,
                'tenant_id' => $tenantId,
                'type' => 'general',
                'direct_key' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            DB::table('chat_messages')
                ->where('tenant_id', $tenantId)
                ->whereNull('conversation_id')
                ->update(['conversation_id' => $conversationId]);
        }
    }
};
