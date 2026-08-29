<?php

declare(strict_types=1);

namespace App\Support;

final class ProductPackageTypes
{
    public const BOTTLE = 'Бутылка';

    public const CAN = 'Банка';

    public const PET = 'ПЭТ';

    public const BAG = 'Пакет';

    public const BOX = 'Коробка';

    public const OTHER = 'Другое';

    /**
     * @return list<string>
     */
    public static function all(): array
    {
        return [
            self::BOTTLE,
            self::CAN,
            self::PET,
            self::BAG,
            self::BOX,
            self::OTHER,
        ];
    }

    public static function isValid(?string $value): bool
    {
        return $value !== null && in_array($value, self::all(), true);
    }

    /**
     * Normalize raw packaging string (Open Food Facts / EN / RU) to Russian catalog value.
     */
    public static function normalize(?string $raw): ?string
    {
        if ($raw === null) {
            return null;
        }

        $value = mb_strtolower(trim($raw));
        $value = str_replace(['en:', 'ru:', 'fr:', 'de:', '-'], ['', '', '', '', ' '], $value);
        $value = preg_replace('/\s+/u', ' ', $value) ?? $value;

        if ($value === '') {
            return null;
        }

        if (self::isValid($raw)) {
            return $raw;
        }

        foreach (self::all() as $label) {
            if (mb_strtolower($label) === $value) {
                return $label;
            }
        }

        $map = [
            'bottle' => self::BOTTLE,
            'glass bottle' => self::BOTTLE,
            'plastic bottle' => self::BOTTLE,
            'бутылка' => self::BOTTLE,
            'стеклянная бутылка' => self::BOTTLE,
            'can' => self::CAN,
            'tin' => self::CAN,
            'банка' => self::CAN,
            'жестяная банка' => self::CAN,
            'pet' => self::PET,
            'пэт' => self::PET,
            'пластик' => self::PET,
            'bag' => self::BAG,
            'sachet' => self::BAG,
            'пакет' => self::BAG,
            'пакетик' => self::BAG,
            'box' => self::BOX,
            'carton' => self::BOX,
            'тетрапак' => self::BOX,
            'коробка' => self::BOX,
            'pack' => self::OTHER,
            'other' => self::OTHER,
            'другое' => self::OTHER,
        ];

        if (isset($map[$value])) {
            return $map[$value];
        }

        foreach ($map as $needle => $label) {
            if (str_contains($value, $needle)) {
                return $label;
            }
        }

        return null;
    }
}
