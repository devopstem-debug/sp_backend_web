<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\ProductBotService;
use Illuminate\Console\Command;

class ProductBotScanCommand extends Command
{
    protected $signature = 'products:bot-scan {--limit=50 : Максимум товаров за проход}';

    protected $description = 'Сканирует неполные товары и создаёт задания для бота обогащения';

    public function handle(ProductBotService $bot): int
    {
        $limit = max(1, min(500, (int) $this->option('limit')));
        $result = $bot->scan($limit);

        $this->info(sprintf(
            'Сканировано: %d, создано заданий: %d, пропущено: %d',
            $result['scanned'],
            $result['created'],
            $result['skipped'],
        ));

        return self::SUCCESS;
    }
}
