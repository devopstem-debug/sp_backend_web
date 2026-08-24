<?php

declare(strict_types=1);

namespace App\Observers;

use App\Models\Product;
use App\Support\DispatchesFirebaseCatalogSync;

class ProductObserver
{
    use DispatchesFirebaseCatalogSync;

    public function saved(Product $product): void
    {
        $this->dispatchCatalogSyncForProduct($product);
    }

    public function deleted(Product $product): void
    {
        $this->dispatchCatalogSyncForProduct($product);
    }

    public function restored(Product $product): void
    {
        $this->dispatchCatalogSyncForProduct($product);
    }

    private function dispatchCatalogSyncForProduct(Product $product): void
    {
        if ($product->owner_tenant_id) {
            $this->dispatchCatalogSync($product->owner_tenant_id);

            return;
        }

        $this->dispatchCatalogSyncForAllTenants();
    }
}
