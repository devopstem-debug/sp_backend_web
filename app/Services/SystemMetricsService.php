<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

final class SystemMetricsService
{
    /**
     * @return array<string, mixed>
     */
    public function snapshot(): array
    {
        $memory = $this->memory();
        $cpu = $this->cpu();
        $disk = $this->disk();
        $gpu = $this->gpu();
        $php = $this->phpRuntime();
        $queue = $this->queue();
        $app = $this->appInfo();

        return [
            'collected_at' => now()->toIso8601String(),
            'hostname' => gethostname() ?: 'unknown',
            'os' => PHP_OS_FAMILY.' · '.php_uname('r'),
            'cpu' => $cpu,
            'memory' => $memory,
            'disk' => $disk,
            'gpu' => $gpu,
            'php' => $php,
            'queue' => $queue,
            'app' => $app,
            'status' => $this->overallStatus($cpu, $memory, $disk, $queue),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function cpu(): array
    {
        $cores = $this->cpuCores();
        $load = function_exists('sys_getloadavg') ? sys_getloadavg() : false;
        $load1 = is_array($load) ? (float) ($load[0] ?? 0) : null;
        $load5 = is_array($load) ? (float) ($load[1] ?? 0) : null;
        $load15 = is_array($load) ? (float) ($load[2] ?? 0) : null;

        $usagePercent = null;
        if ($load1 !== null && $cores > 0) {
            $usagePercent = round(min(100, ($load1 / $cores) * 100), 1);
        }

        $stat = $this->readProcStat();

        return [
            'cores' => $cores,
            'model' => $this->cpuModel(),
            'load_1' => $load1 !== null ? round($load1, 2) : null,
            'load_5' => $load5 !== null ? round($load5, 2) : null,
            'load_15' => $load15 !== null ? round($load15, 2) : null,
            'usage_percent' => $usagePercent,
            'stat' => $stat,
        ];
    }

    private function cpuCores(): int
    {
        $nproc = $this->shellInt('nproc 2>/dev/null');
        if ($nproc > 0) {
            return $nproc;
        }

        if (is_readable('/proc/cpuinfo')) {
            $count = preg_match_all('/^processor\s*:/m', (string) file_get_contents('/proc/cpuinfo'));
            if ($count > 0) {
                return $count;
            }
        }

        return 1;
    }

    private function cpuModel(): ?string
    {
        if (! is_readable('/proc/cpuinfo')) {
            return null;
        }

        $info = (string) file_get_contents('/proc/cpuinfo');
        if (preg_match('/^model name\s*:\s*(.+)$/mi', $info, $m)) {
            return trim($m[1]);
        }

        return null;
    }

    /**
     * @return array{idle_percent: float|null, iowait_percent: float|null}|null
     */
    private function readProcStat(): ?array
    {
        if (! is_readable('/proc/stat')) {
            return null;
        }

        $line = strtok((string) file_get_contents('/proc/stat'), "\n");
        if (! is_string($line) || ! str_starts_with($line, 'cpu ')) {
            return null;
        }

        $parts = preg_split('/\s+/', trim($line)) ?: [];
        // cpu user nice system idle iowait irq softirq steal
        $nums = array_map('floatval', array_slice($parts, 1));
        $total = array_sum($nums);
        if ($total <= 0) {
            return null;
        }

        $idle = ($nums[3] ?? 0) + ($nums[4] ?? 0);
        $iowait = $nums[4] ?? 0;

        return [
            'idle_percent' => round(($idle / $total) * 100, 1),
            'iowait_percent' => round(($iowait / $total) * 100, 1),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function memory(): array
    {
        $total = null;
        $available = null;
        $free = null;
        $buffers = null;
        $cached = null;
        $swapTotal = null;
        $swapFree = null;

        if (is_readable('/proc/meminfo')) {
            $map = $this->parseMeminfo((string) file_get_contents('/proc/meminfo'));
            $total = $map['MemTotal'] ?? null;
            $available = $map['MemAvailable'] ?? null;
            $free = $map['MemFree'] ?? null;
            $buffers = $map['Buffers'] ?? null;
            $cached = $map['Cached'] ?? null;
            $swapTotal = $map['SwapTotal'] ?? null;
            $swapFree = $map['SwapFree'] ?? null;
        }

        $used = null;
        $usagePercent = null;
        if ($total !== null && $available !== null) {
            $used = max(0, $total - $available);
            $usagePercent = $total > 0 ? round(($used / $total) * 100, 1) : null;
        }

        $swapUsed = null;
        $swapPercent = null;
        if ($swapTotal !== null && $swapFree !== null && $swapTotal > 0) {
            $swapUsed = max(0, $swapTotal - $swapFree);
            $swapPercent = round(($swapUsed / $swapTotal) * 100, 1);
        }

        return [
            'total_bytes' => $total,
            'available_bytes' => $available,
            'free_bytes' => $free,
            'used_bytes' => $used,
            'buffers_bytes' => $buffers,
            'cached_bytes' => $cached,
            'usage_percent' => $usagePercent,
            'swap_total_bytes' => $swapTotal,
            'swap_used_bytes' => $swapUsed,
            'swap_usage_percent' => $swapPercent,
        ];
    }

    /**
     * @return array<string, int>
     */
    private function parseMeminfo(string $raw): array
    {
        $out = [];
        foreach (explode("\n", $raw) as $line) {
            if (! preg_match('/^(\w+):\s+(\d+)/', $line, $m)) {
                continue;
            }
            // Values are kB
            $out[$m[1]] = (int) $m[2] * 1024;
        }

        return $out;
    }

    /**
     * @return array<string, mixed>
     */
    private function disk(): array
    {
        $path = base_path();
        $total = @disk_total_space($path);
        $free = @disk_free_space($path);
        $total = is_float($total) || is_int($total) ? (int) $total : null;
        $free = is_float($free) || is_int($free) ? (int) $free : null;
        $used = ($total !== null && $free !== null) ? max(0, $total - $free) : null;
        $usagePercent = ($total && $used !== null)
            ? round(($used / $total) * 100, 1)
            : null;

        return [
            'path' => $path,
            'total_bytes' => $total,
            'free_bytes' => $free,
            'used_bytes' => $used,
            'usage_percent' => $usagePercent,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function gpu(): array
    {
        $bin = $this->shellLine('command -v nvidia-smi 2>/dev/null');
        if ($bin === null || $bin === '') {
            return [
                'available' => false,
                'message' => 'NVIDIA GPU / nvidia-smi не найден на сервере',
                'devices' => [],
            ];
        }

        $csv = $this->shellLine(
            'nvidia-smi --query-gpu=index,name,utilization.gpu,utilization.memory,memory.total,memory.used,memory.free,temperature.gpu --format=csv,noheader,nounits 2>/dev/null',
        );

        if ($csv === null || $csv === '') {
            return [
                'available' => false,
                'message' => 'nvidia-smi есть, но данные недоступны',
                'devices' => [],
            ];
        }

        $devices = [];
        foreach (explode("\n", $csv) as $line) {
            $line = trim($line);
            if ($line === '') {
                continue;
            }
            $parts = array_map('trim', explode(',', $line));
            if (count($parts) < 8) {
                continue;
            }

            $memTotalMiB = (float) $parts[4];
            $memUsedMiB = (float) $parts[5];
            $devices[] = [
                'index' => (int) $parts[0],
                'name' => $parts[1],
                'utilization_percent' => (float) $parts[2],
                'memory_utilization_percent' => (float) $parts[3],
                'memory_total_bytes' => (int) round($memTotalMiB * 1024 * 1024),
                'memory_used_bytes' => (int) round($memUsedMiB * 1024 * 1024),
                'memory_free_bytes' => (int) round(((float) $parts[6]) * 1024 * 1024),
                'temperature_c' => (float) $parts[7],
            ];
        }

        return [
            'available' => $devices !== [],
            'message' => $devices === [] ? 'GPU не обнаружены' : null,
            'devices' => $devices,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function phpRuntime(): array
    {
        $limit = ini_get('memory_limit');
        $limitBytes = $this->iniBytes(is_string($limit) ? $limit : '128M');

        return [
            'version' => PHP_VERSION,
            'sapi' => PHP_SAPI,
            'memory_usage_bytes' => memory_get_usage(true),
            'memory_peak_bytes' => memory_get_peak_usage(true),
            'memory_limit' => is_string($limit) ? $limit : null,
            'memory_limit_bytes' => $limitBytes,
            'opcache_enabled' => function_exists('opcache_get_status')
                ? (bool) (opcache_get_status(false)['opcache_enabled'] ?? false)
                : false,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function queue(): array
    {
        $connection = (string) config('queue.default');
        $pending = null;
        $failed = null;
        $oldestPendingSeconds = null;

        try {
            if (Schema::hasTable('failed_jobs')) {
                $failed = (int) DB::table('failed_jobs')->count();
            }

            if ($connection === 'redis') {
                $pending = $this->redisPendingCount();
            } elseif ($connection === 'database' && Schema::hasTable('jobs')) {
                $pending = (int) DB::table('jobs')->count();
                $oldest = DB::table('jobs')->min('created_at');
                if ($oldest !== null) {
                    $oldestPendingSeconds = max(0, time() - (int) $oldest);
                }
            } elseif (Schema::hasTable('jobs')) {
                $pending = (int) DB::table('jobs')->count();
            }
        } catch (Throwable) {
            // ignore DB/Redis issues in metrics endpoint
        }

        return [
            'connection' => $connection,
            'pending' => $pending,
            'failed' => $failed,
            'oldest_pending_seconds' => $oldestPendingSeconds,
        ];
    }

    private function redisPendingCount(): ?int
    {
        try {
            /** @var \Illuminate\Redis\Connections\Connection $redis */
            $redis = \Illuminate\Support\Facades\Redis::connection();
            $prefix = (string) config('database.redis.options.prefix', '');
            $queues = ['default', 'exports', 'notifications', 'firebase'];
            $total = 0;
            foreach ($queues as $queue) {
                $key = $prefix.'queues:'.$queue;
                $total += (int) $redis->llen($key);
            }

            return $total;
        } catch (Throwable) {
            return null;
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function appInfo(): array
    {
        $uptimeSeconds = null;
        if (is_readable('/proc/uptime')) {
            $raw = trim((string) file_get_contents('/proc/uptime'));
            $parts = explode(' ', $raw);
            $uptimeSeconds = isset($parts[0]) ? (int) floor((float) $parts[0]) : null;
        }

        return [
            'env' => (string) config('app.env'),
            'debug' => (bool) config('app.debug'),
            'laravel' => app()->version(),
            'timezone' => (string) config('app.timezone'),
            'uptime_seconds' => $uptimeSeconds,
            'cache_store' => (string) config('cache.default'),
            'session_driver' => (string) config('session.driver'),
            'broadcast_connection' => (string) config('broadcasting.default'),
        ];
    }

    /**
     * @param  array<string, mixed>  $cpu
     * @param  array<string, mixed>  $memory
     * @param  array<string, mixed>  $disk
     * @param  array<string, mixed>  $queue
     */
    private function overallStatus(array $cpu, array $memory, array $disk, array $queue): string
    {
        $cpuPct = $cpu['usage_percent'] ?? null;
        $memPct = $memory['usage_percent'] ?? null;
        $diskPct = $disk['usage_percent'] ?? null;
        $failed = $queue['failed'] ?? 0;

        if (
            ($cpuPct !== null && $cpuPct >= 90)
            || ($memPct !== null && $memPct >= 92)
            || ($diskPct !== null && $diskPct >= 92)
            || (is_int($failed) && $failed > 20)
        ) {
            return 'critical';
        }

        if (
            ($cpuPct !== null && $cpuPct >= 75)
            || ($memPct !== null && $memPct >= 80)
            || ($diskPct !== null && $diskPct >= 80)
            || (is_int($failed) && $failed > 0)
        ) {
            return 'warning';
        }

        return 'ok';
    }

    private function iniBytes(string $value): ?int
    {
        $value = trim($value);
        if ($value === '' || $value === '-1') {
            return null;
        }

        if (! preg_match('/^(\d+)\s*([KMG])?B?$/i', $value, $m)) {
            return is_numeric($value) ? (int) $value : null;
        }

        $n = (int) $m[1];
        $unit = strtoupper($m[2] ?? '');

        return match ($unit) {
            'K' => $n * 1024,
            'M' => $n * 1024 * 1024,
            'G' => $n * 1024 * 1024 * 1024,
            default => $n,
        };
    }

    private function shellLine(string $command): ?string
    {
        if (! function_exists('shell_exec')) {
            return null;
        }

        try {
            $out = @shell_exec($command);
        } catch (Throwable) {
            return null;
        }

        if (! is_string($out)) {
            return null;
        }

        $out = trim($out);

        return $out === '' ? null : $out;
    }

    private function shellInt(string $command): int
    {
        $line = $this->shellLine($command);

        return $line !== null && ctype_digit($line) ? (int) $line : 0;
    }
}
