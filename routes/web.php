<?php

use App\Http\Controllers\AccountStatusController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\ChatPageController;
use App\Http\Controllers\CoolerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DatabaseController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\ExportController;
use App\Http\Controllers\FloorPlanController;
use App\Http\Controllers\ImportController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\LegalDocumentController;
use App\Http\Controllers\LegalPublicController;
use App\Http\Controllers\LogController;
use App\Http\Controllers\PlanController;
use App\Http\Controllers\PlanogramController;
use App\Http\Controllers\PricingController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\ShelfController;
use App\Http\Controllers\StandController;
use App\Http\Controllers\StoreController;
use App\Http\Controllers\TenantController;
use App\Http\Controllers\UserController;
use App\Support\Permissions;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return auth()->check()
        ? redirect()->route('dashboard')
        : redirect()->route('login');
});

Route::get('plans', [PricingController::class, 'index'])->name('plans.index');
Route::get('oferta', [LegalPublicController::class, 'oferta'])->name('legal.oferta');
Route::get('privacy-policy', [LegalPublicController::class, 'privacy'])->name('legal.privacy');
Route::get('legal/{type}/pdf', [LegalPublicController::class, 'download'])->name('legal.download');

Route::middleware('auth')->group(function (): void {
    Route::get('account-deactivated', [AccountStatusController::class, 'deactivated'])
        ->name('account.deactivated');
    Route::get('account-locked', [AccountStatusController::class, 'locked'])
        ->name('account.locked');
});

Route::middleware(['auth', 'user.active', 'tenant.active'])->group(function () {
    Route::get('billing', [BillingController::class, 'index'])->name('billing.index');
    Route::post('billing/subscribe', [BillingController::class, 'subscribe'])->name('billing.subscribe');
    Route::post('billing/confirm-payment', [BillingController::class, 'confirmPayment'])
        ->name('billing.confirm-payment');
    Route::get('billing/bank-details', [BillingController::class, 'showBankDetails'])
        ->name('billing.bank-details');
});

Route::middleware(['auth', 'user.active', 'tenant.active', 'subscription.active'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/analytics', [AnalyticsController::class, 'index'])->name('analytics.index');

    Route::get('chat', [ChatPageController::class, 'index'])->name('chat.index');
    Route::get('chat/conversations', [ChatController::class, 'conversations'])->name('chat.conversations');
    Route::get('chat/users', [ChatController::class, 'users'])->name('chat.users');
    Route::post('chat/heartbeat', [ChatController::class, 'heartbeat'])->name('chat.heartbeat');
    Route::post('chat/direct', [ChatController::class, 'storeDirect'])->name('chat.direct');
    Route::get('chat/conversations/{conversationId}/messages', [ChatController::class, 'messages'])
        ->name('chat.messages');
    Route::post('chat/conversations/{conversationId}/messages', [ChatController::class, 'store'])
        ->name('chat.messages.store');
    Route::post('chat/conversations/{conversationId}/read', [ChatController::class, 'markRead'])
        ->name('chat.messages.read');

    Route::post('users/{id}/toggle-active', [UserController::class, 'toggleActive'])
        ->name('users.toggle-active');
    Route::post('users/{id}/sync-firebase', [UserController::class, 'syncFirebase'])
        ->name('users.sync-firebase');
    Route::post('users/{id}/delete-firebase', [UserController::class, 'deleteFromFirebase'])
        ->name('users.delete-firebase');
    Route::post('users/{id}/comments', [UserController::class, 'storeComment'])
        ->name('users.comments.store');
    Route::resource('users', UserController::class);

    Route::post('tenants/{tenant}/toggle-active', [TenantController::class, 'toggleActive'])
        ->name('tenants.toggle-active');
    Route::resource('tenants', TenantController::class)->except(['destroy']);

    Route::post('admin/payments/{payment}/approve', [PlanController::class, 'approvePayment'])
        ->name('admin.payments.approve');
    Route::post('admin/payments/{payment}/reject', [PlanController::class, 'rejectPayment'])
        ->name('admin.payments.reject');
    Route::post('admin/bank-accounts', [PlanController::class, 'storeBankAccount'])
        ->name('admin.bank-accounts.store');
    Route::put('admin/bank-accounts/{bankAccount}', [PlanController::class, 'updateBankAccount'])
        ->name('admin.bank-accounts.update');
    Route::delete('admin/bank-accounts/{bankAccount}', [PlanController::class, 'destroyBankAccount'])
        ->name('admin.bank-accounts.destroy');
    Route::resource('admin/plans', PlanController::class)
        ->except(['show'])
        ->names('admin.plans')
        ->parameters(['plans' => 'plan']);

    Route::get('admin/invoices', [InvoiceController::class, 'index'])->name('admin.invoices.index');
    Route::get('admin/invoices/create', [InvoiceController::class, 'create'])->name('admin.invoices.create');
    Route::post('admin/invoices', [InvoiceController::class, 'store'])->name('admin.invoices.store');
    Route::get('admin/invoices/{invoice}/pdf', [InvoiceController::class, 'generatePdf'])->name('admin.invoices.pdf');
    Route::post('admin/invoices/{invoice}/mark-paid', [InvoiceController::class, 'markAsPaid'])->name('admin.invoices.mark-paid');
    Route::post('admin/invoices/{invoice}/send', [InvoiceController::class, 'sendToEmail'])->name('admin.invoices.send');

    Route::get('admin/legal', [LegalDocumentController::class, 'index'])->name('admin.legal.index');
    Route::get('admin/legal/create', [LegalDocumentController::class, 'create'])->name('admin.legal.create');
    Route::post('admin/legal', [LegalDocumentController::class, 'store'])->name('admin.legal.store');
    Route::get('admin/legal/{legal}/edit', [LegalDocumentController::class, 'edit'])->name('admin.legal.edit');
    Route::put('admin/legal/{legal}', [LegalDocumentController::class, 'update'])->name('admin.legal.update');
    Route::post('admin/legal/{legal}/publish', [LegalDocumentController::class, 'publish'])->name('admin.legal.publish');
    Route::get('admin/legal/{legal}/pdf', [LegalDocumentController::class, 'downloadPdf'])->name('admin.legal.pdf');

    Route::get('database/sql', [DatabaseController::class, 'sql'])->name('database.sql');
    Route::post('database/sql', [DatabaseController::class, 'executeSql'])->name('database.sql.execute');
    Route::get('database', [DatabaseController::class, 'index'])->name('database.index');
    Route::get('database/{table}', [DatabaseController::class, 'show'])->name('database.show');

    Route::get('logs', [LogController::class, 'index'])->name('logs.index');
    Route::get('logs/audit', [LogController::class, 'audit'])->name('logs.audit');
    Route::get('logs/logins', [LogController::class, 'logins'])->name('logs.logins');
    Route::get('logs/system', [LogController::class, 'system'])->name('logs.system');
    Route::post('logs/system/clear', [LogController::class, 'clearSystem'])
        ->name('logs.system.clear');

    Route::get('stores/geocode', [StoreController::class, 'geocode'])
        ->middleware('permission:'.Permissions::CREATE_STORES.'|'.Permissions::EDIT_STORES)
        ->name('stores.geocode');
    Route::post('stores/{id}/restore', [StoreController::class, 'restore'])
        ->name('stores.restore');
    Route::delete('stores/{id}/force', [StoreController::class, 'forceDelete'])
        ->name('stores.force-delete');
    Route::resource('stores', StoreController::class)->except(['show']);

    Route::post('products/approve-unchecked', [ProductController::class, 'approveUnchecked'])
        ->name('products.approve-unchecked');
    Route::post('products/{product}/approve', [ProductController::class, 'approve'])
        ->name('products.approve');
    Route::post('products/{id}/restore', [ProductController::class, 'restore'])
        ->name('products.restore');
    Route::delete('products/{id}/force', [ProductController::class, 'forceDelete'])
        ->name('products.force-delete');
    Route::get('products/barcode-lookup', [ProductController::class, 'lookupBarcode'])
        ->name('products.barcode-lookup');
    Route::resource('products', ProductController::class)->except(['show']);

    Route::post('departments/{id}/restore', [DepartmentController::class, 'restore'])
        ->name('departments.restore');
    Route::delete('departments/{id}/force', [DepartmentController::class, 'forceDelete'])
        ->name('departments.force-delete');
    Route::resource('departments', DepartmentController::class)->except(['show']);

    Route::get('shelves/preview-code', [ShelfController::class, 'previewCode'])
        ->name('shelves.preview-code');
    Route::post('shelves/{id}/restore', [ShelfController::class, 'restore'])
        ->name('shelves.restore');
    Route::delete('shelves/{id}/force', [ShelfController::class, 'forceDelete'])
        ->name('shelves.force-delete');
    Route::resource('shelves', ShelfController::class)->except(['show']);

    Route::get('coolers/preview-code', [CoolerController::class, 'previewCode'])
        ->name('coolers.preview-code');
    Route::post('coolers/{id}/restore', [CoolerController::class, 'restore'])
        ->name('coolers.restore');
    Route::delete('coolers/{id}/force', [CoolerController::class, 'forceDelete'])
        ->name('coolers.force-delete');
    Route::resource('coolers', CoolerController::class)->except(['show']);

    Route::get('stands/preview-code', [StandController::class, 'previewCode'])
        ->name('stands.preview-code');
    Route::post('stands/{id}/restore', [StandController::class, 'restore'])
        ->name('stands.restore');
    Route::delete('stands/{id}/force', [StandController::class, 'forceDelete'])
        ->name('stands.force-delete');
    Route::resource('stands', StandController::class)->except(['show']);

    Route::get('settings', [SettingsController::class, 'index'])->name('settings.index');
    Route::patch('settings/profile', [SettingsController::class, 'updateProfile'])
        ->name('settings.profile.update');
    Route::patch('settings/password', [SettingsController::class, 'updatePassword'])
        ->name('settings.password.update');
    Route::patch('settings/integrations', [SettingsController::class, 'updateIntegrations'])
        ->name('settings.integrations.update');

    Route::get('planograms', [PlanogramController::class, 'index'])->name('planograms.index');
    Route::get('planograms/{shelf}', [PlanogramController::class, 'show'])->name('planograms.show');
    Route::post('planograms/{shelf}/placements', [PlanogramController::class, 'storePlacement'])
        ->name('planograms.placements.store');
    Route::delete('planograms/placements/{id}', [PlanogramController::class, 'destroyPlacement'])
        ->name('planograms.placements.destroy');

    Route::get('floor-plan', [FloorPlanController::class, 'stores'])->name('floor-plan.stores');
    Route::get('floor-plan/{store}', [FloorPlanController::class, 'index'])->name('floor-plan.index');
    Route::post('floor-plan/{store}/save', [FloorPlanController::class, 'save'])->name('floor-plan.save');
    Route::post('floor-plan/{store}/walls', [FloorPlanController::class, 'addWall'])->name('floor-plan.walls.store');
    Route::delete('floor-plan/walls/{wall}', [FloorPlanController::class, 'removeWall'])->name('floor-plan.walls.destroy');

    Route::get('export', [ExportController::class, 'index'])->name('export.index');
    Route::get('export/{storeId}/download', [ExportController::class, 'download'])
        ->name('export.download');
    Route::post('export/{storeId}/firebase', [ExportController::class, 'sendToFirebase'])
        ->name('export.firebase');
    Route::post('export/catalog/firebase', [ExportController::class, 'syncCatalogToFirebase'])
        ->name('export.catalog.firebase');

    Route::get('import', [ImportController::class, 'index'])->name('import.index');
    Route::post('import/upload', [ImportController::class, 'upload'])->name('import.upload');
    Route::get('import/template', [ImportController::class, 'downloadTemplate'])
        ->name('import.template');
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
