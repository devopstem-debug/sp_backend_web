<?php

use App\Http\Controllers\Api\V1\DepartmentController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\StoreController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\ExportController;
use App\Http\Controllers\NotificationController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')
    ->name('api.v1.')
    ->middleware(['auth:sanctum', 'user.active', 'tenant.active'])
    ->group(function (): void {
        Route::apiResource('stores', StoreController::class);
        Route::apiResource('departments', DepartmentController::class);
        Route::apiResource('products', ProductController::class);

        Route::get('export/{storeId}', [ExportController::class, 'generate'])
            ->name('export.show');

        Route::get('notifications/unread-count', [NotificationController::class, 'unreadCount'])
            ->name('notifications.unread-count');
        Route::post('notifications/read-all', [NotificationController::class, 'markAllAsRead'])
            ->name('notifications.read-all');
        Route::get('notifications', [NotificationController::class, 'index'])
            ->name('notifications.index');
        Route::post('notifications/{id}/read', [NotificationController::class, 'markAsRead'])
            ->name('notifications.read');

        Route::get('chat/messages', [ChatController::class, 'index'])
            ->name('chat.index');
        Route::post('chat/messages', [ChatController::class, 'storeGeneral'])
            ->name('chat.store');
        Route::post('chat/read', [ChatController::class, 'markGeneralRead'])
            ->name('chat.read');
        Route::get('chat/conversations', [ChatController::class, 'conversations'])
            ->name('chat.conversations');
        Route::get('chat/users', [ChatController::class, 'users'])
            ->name('chat.users');
        Route::post('chat/heartbeat', [ChatController::class, 'heartbeat'])
            ->name('chat.heartbeat');
        Route::post('chat/direct', [ChatController::class, 'storeDirect'])
            ->name('chat.direct');
        Route::get('chat/conversations/{conversationId}/messages', [ChatController::class, 'messages'])
            ->name('chat.conversation-messages');
        Route::post('chat/conversations/{conversationId}/messages', [ChatController::class, 'store'])
            ->name('chat.conversation-messages.store');
        Route::post('chat/conversations/{conversationId}/read', [ChatController::class, 'markRead'])
            ->name('chat.conversation-read');
    });
