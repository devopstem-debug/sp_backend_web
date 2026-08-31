<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Store;
use Database\Seeders\Concerns\ResolvesCatalogStore;
use Illuminate\Database\Seeder;

/**
 * Стандартный каталог отделов для магазина.
 *
 * php artisan db:seed --class=DepartmentsCatalogSeeder
 *
 * Опционально: STORE_CATALOG_STORE=<uuid> — иначе первый магазин.
 */
class DepartmentsCatalogSeeder extends Seeder
{
    use ResolvesCatalogStore;

    /**
     * @return list<array{code: string, name: string, sort_order: int}>
     */
    public static function catalog(): array
    {
        return [
            ['code' => 'WC', 'name' => 'Вода и Колы', 'sort_order' => 1],
            ['code' => 'WJ', 'name' => 'Соки и Нектары', 'sort_order' => 2],
            ['code' => 'WE', 'name' => 'Энергетики', 'sort_order' => 3],
            ['code' => 'WI', 'name' => 'Изотоники и Витамины', 'sort_order' => 4],
            ['code' => 'WT', 'name' => 'Чай/Кофе холодные', 'sort_order' => 5],
            ['code' => 'KW', 'name' => 'Квас', 'sort_order' => 6],
            ['code' => 'BW', 'name' => 'Пиво и Вино', 'sort_order' => 7],
            ['code' => 'SA', 'name' => 'Крепкий Алкоголь', 'sort_order' => 8],
            ['code' => 'CH', 'name' => 'Шампанское', 'sort_order' => 9],
            ['code' => 'DF', 'name' => 'Молочные продукты', 'sort_order' => 10],
            ['code' => 'CHS', 'name' => 'Сыры', 'sort_order' => 11],
            ['code' => 'BT', 'name' => 'Масло и Маргарин', 'sort_order' => 12],
            ['code' => 'YG', 'name' => 'Йогурты', 'sort_order' => 13],
            ['code' => 'CR', 'name' => 'Сметана и Творог', 'sort_order' => 14],
            ['code' => 'DS', 'name' => 'Десерты молочные', 'sort_order' => 15],
            ['code' => 'BR', 'name' => 'Хлеб', 'sort_order' => 16],
            ['code' => 'BK', 'name' => 'Булочки и Сдоба', 'sort_order' => 17],
            ['code' => 'PT', 'name' => 'Пирожные и Торты', 'sort_order' => 18],
            ['code' => 'CK', 'name' => 'Печенье и Крекеры', 'sort_order' => 19],
            ['code' => 'BL', 'name' => 'Блины и Оладьи', 'sort_order' => 20],
            ['code' => 'MT', 'name' => 'Мясо свежее', 'sort_order' => 21],
            ['code' => 'PL', 'name' => 'Птица', 'sort_order' => 22],
            ['code' => 'SG', 'name' => 'Колбасы и Сосиски', 'sort_order' => 23],
            ['code' => 'DL', 'name' => 'Деликатесы мясные', 'sort_order' => 24],
            ['code' => 'SM', 'name' => 'Копчёности', 'sort_order' => 25],
            ['code' => 'FS', 'name' => 'Рыба свежая', 'sort_order' => 26],
            ['code' => 'FZ', 'name' => 'Рыба замороженная', 'sort_order' => 27],
            ['code' => 'SF', 'name' => 'Морепродукты', 'sort_order' => 28],
            ['code' => 'FK', 'name' => 'Рыбные консервы', 'sort_order' => 29],
            ['code' => 'FD', 'name' => 'Рыбные деликатесы', 'sort_order' => 30],
            ['code' => 'VG', 'name' => 'Овощи', 'sort_order' => 31],
            ['code' => 'FR', 'name' => 'Фрукты', 'sort_order' => 32],
            ['code' => 'GR', 'name' => 'Зелень и Салаты', 'sort_order' => 33],
            ['code' => 'BRY', 'name' => 'Ягоды', 'sort_order' => 34],
            ['code' => 'DN', 'name' => 'Сухофрукты и Орехи', 'sort_order' => 35],
            ['code' => 'GRO', 'name' => 'Крупы', 'sort_order' => 36],
            ['code' => 'PS', 'name' => 'Макароны', 'sort_order' => 37],
            ['code' => 'FL', 'name' => 'Мука', 'sort_order' => 38],
            ['code' => 'SGS', 'name' => 'Сахар и Соль', 'sort_order' => 39],
            ['code' => 'CS', 'name' => 'Консервы', 'sort_order' => 40],
            ['code' => 'SC', 'name' => 'Соусы и Кетчупы', 'sort_order' => 41],
            ['code' => 'OIL', 'name' => 'Масло растительное', 'sort_order' => 42],
            ['code' => 'SP', 'name' => 'Специи и Приправы', 'sort_order' => 43],
            ['code' => 'FV', 'name' => 'Овощи замороженные', 'sort_order' => 44],
            ['code' => 'FF', 'name' => 'Фрукты замороженные', 'sort_order' => 45],
            ['code' => 'FM', 'name' => 'Мясо замороженное', 'sort_order' => 46],
            ['code' => 'FP', 'name' => 'Полуфабрикаты', 'sort_order' => 47],
            ['code' => 'PI', 'name' => 'Пицца и Пельмени', 'sort_order' => 48],
            ['code' => 'IC', 'name' => 'Мороженое', 'sort_order' => 49],
            ['code' => 'CHC', 'name' => 'Шоколад', 'sort_order' => 50],
            ['code' => 'CD', 'name' => 'Конфеты', 'sort_order' => 51],
            ['code' => 'CAR', 'name' => 'Карамель и Леденцы', 'sort_order' => 52],
            ['code' => 'WF', 'name' => 'Вафли', 'sort_order' => 53],
            ['code' => 'ZP', 'name' => 'Зефир и Пастила', 'sort_order' => 54],
            ['code' => 'SN', 'name' => 'Снеки', 'sort_order' => 55],
            ['code' => 'CHP', 'name' => 'Чипсы', 'sort_order' => 56],
            ['code' => 'SUK', 'name' => 'Сухарики', 'sort_order' => 57],
            ['code' => 'NT', 'name' => 'Орешки солёные', 'sort_order' => 58],
            ['code' => 'POP', 'name' => 'Попкорн', 'sort_order' => 59],
            ['code' => 'TE', 'name' => 'Чай', 'sort_order' => 60],
            ['code' => 'CF', 'name' => 'Кофе', 'sort_order' => 61],
            ['code' => 'CC', 'name' => 'Какао', 'sort_order' => 62],
            ['code' => 'LD', 'name' => 'Стиральные порошки', 'sort_order' => 63],
            ['code' => 'CLN', 'name' => 'Чистящие средства', 'sort_order' => 64],
            ['code' => 'DSP', 'name' => 'Для посуды', 'sort_order' => 65],
            ['code' => 'AIR', 'name' => 'Освежители', 'sort_order' => 66],
            ['code' => 'SH', 'name' => 'Шампуни', 'sort_order' => 67],
            ['code' => 'SO', 'name' => 'Мыло', 'sort_order' => 68],
            ['code' => 'TP', 'name' => 'Зубная паста', 'sort_order' => 69],
            ['code' => 'CRM', 'name' => 'Кремы', 'sort_order' => 70],
            ['code' => 'DC', 'name' => 'Дезодоранты', 'sort_order' => 71],
            ['code' => 'BF', 'name' => 'Детское питание', 'sort_order' => 72],
            ['code' => 'DP', 'name' => 'Подгузники', 'sort_order' => 73],
            ['code' => 'PF', 'name' => 'Корм для животных', 'sort_order' => 74],
            ['code' => 'PC', 'name' => 'Корм для кошек', 'sort_order' => 75],
            ['code' => 'PD', 'name' => 'Корм для собак', 'sort_order' => 76],
            ['code' => 'XX', 'name' => 'Другое', 'sort_order' => 99],
        ];
    }

    public function run(): void
    {
        $store = self::resolveCatalogStore();

        if (! $store) {
            $this->command?->warn('Нет магазина. Сначала создайте магазин.');

            return;
        }

        $departments = self::catalog();
        $created = 0;

        foreach ($departments as $dept) {
            Department::query()->updateOrCreate(
                ['store_id' => $store->id, 'code' => $dept['code']],
                [
                    'name' => ['ru' => $dept['name'], 'en' => $dept['name']],
                    'color' => '#6366F1',
                    'sort_order' => $dept['sort_order'],
                ],
            );
            $created++;
        }

        $storeLabel = $this->catalogStoreLabel($store);
        $this->command?->info("Каталог отделов для «{$storeLabel}»: {$created} шт.");
    }
}
