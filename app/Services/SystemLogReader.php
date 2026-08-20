<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\File;

class SystemLogReader
{
    /**
     * @return list<array{id: int, level: string, datetime: string|null, message: string, raw: string}>
     */
    public function read(string $path, int $limit = 200, ?string $level = null, ?string $search = null): array
    {
        if (! File::exists($path)) {
            return [];
        }

        $content = File::get($path);
        if ($content === '') {
            return [];
        }

        $entries = $this->parseEntries($content);
        $entries = array_reverse($entries);

        if ($level !== null && $level !== '') {
            $levelUpper = strtoupper($level);
            $entries = array_values(array_filter(
                $entries,
                static fn (array $entry): bool => $entry['level'] === $levelUpper,
            ));
        }

        if ($search !== null && trim($search) !== '') {
            $needle = mb_strtolower(trim($search));
            $entries = array_values(array_filter(
                $entries,
                static fn (array $entry): bool => str_contains(mb_strtolower($entry['raw']), $needle),
            ));
        }

        $entries = array_slice($entries, 0, $limit);

        return array_values(array_map(
            static function (array $entry, int $index): array {
                $entry['id'] = $index + 1;

                return $entry;
            },
            $entries,
            array_keys($entries),
        ));
    }

    public function clear(string $path): void
    {
        $directory = dirname($path);
        if (! File::isDirectory($directory)) {
            File::makeDirectory($directory, 0755, true);
        }

        File::put($path, '');
    }

    /**
     * @return list<array{level: string, datetime: string|null, message: string, raw: string}>
     */
    private function parseEntries(string $content): array
    {
        $lines = preg_split("/\r\n|\n|\r/", $content) ?: [];
        $entries = [];
        $current = null;

        foreach ($lines as $line) {
            if (preg_match('/^\[(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[+-]\d{2}:?\d{2})?)\]\s+\w+\.(\w+):\s*(.*)$/', $line, $matches)) {
                if ($current !== null) {
                    $entries[] = $current;
                }

                $current = [
                    'datetime' => $matches[1],
                    'level' => strtoupper($matches[2]),
                    'message' => $matches[3],
                    'raw' => $line,
                ];

                continue;
            }

            if ($current === null) {
                if (trim($line) === '') {
                    continue;
                }

                $detected = $this->detectLevel($line);
                $current = [
                    'datetime' => null,
                    'level' => $detected,
                    'message' => $line,
                    'raw' => $line,
                ];

                continue;
            }

            $current['raw'] .= "\n".$line;
            if (trim($line) !== '') {
                $current['message'] .= "\n".$line;
            }
        }

        if ($current !== null) {
            $entries[] = $current;
        }

        return $entries;
    }

    private function detectLevel(string $line): string
    {
        $upper = strtoupper($line);

        foreach (['EMERGENCY', 'ALERT', 'CRITICAL', 'ERROR', 'WARNING', 'NOTICE', 'INFO', 'DEBUG'] as $level) {
            if (str_contains($upper, '.'.$level.':') || str_contains($upper, $level.':')) {
                return $level;
            }
        }

        return 'INFO';
    }
}
