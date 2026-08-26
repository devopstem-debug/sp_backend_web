<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Process;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class DatabaseDumpService
{
    public function downloadSqlDump(): StreamedResponse
    {
        $driver = (string) config('database.default');
        $connection = config("database.connections.{$driver}");

        if (! is_array($connection)) {
            throw new RuntimeException('Подключение к базе данных не настроено.');
        }

        $this->assertDumpAvailable($driver, $connection);

        $filename = sprintf(
            'sp-backup-%s-%s.sql',
            $driver,
            now()->format('Ymd-His'),
        );

        return response()->streamDownload(
            function () use ($driver, $connection): void {
                if (function_exists('set_time_limit')) {
                    @set_time_limit(0);
                }

                match ($driver) {
                    'pgsql' => $this->streamPostgresDump($connection),
                    'mysql', 'mariadb' => $this->streamMysqlDump($connection),
                    'sqlite' => $this->streamSqliteDump($connection),
                    default => throw new RuntimeException(
                        "Экспорт SQL не поддерживается для драйвера «{$driver}».",
                    ),
                };
            },
            $filename,
            [
                'Content-Type' => 'application/sql; charset=UTF-8',
                'X-Accel-Buffering' => 'no',
            ],
        );
    }

    /**
     * @param  array<string, mixed>  $connection
     */
    private function assertDumpAvailable(string $driver, array $connection): void
    {
        match ($driver) {
            'pgsql' => $this->assertPostgresReady($connection),
            'mysql', 'mariadb' => $this->assertMysqlReady($connection),
            'sqlite' => $this->assertSqliteReady($connection),
            default => throw new RuntimeException(
                "Экспорт SQL не поддерживается для драйвера «{$driver}».",
            ),
        };
    }

    /**
     * @param  array<string, mixed>  $connection
     */
    private function assertPostgresReady(array $connection): void
    {
        if ((string) ($connection['database'] ?? '') === '' || (string) ($connection['username'] ?? '') === '') {
            throw new RuntimeException('Неполные настройки PostgreSQL для pg_dump.');
        }

        if (! $this->commandExists('pg_dump')) {
            throw new RuntimeException('На сервере не найден pg_dump. Установите postgresql-client.');
        }
    }

    /**
     * @param  array<string, mixed>  $connection
     */
    private function assertMysqlReady(array $connection): void
    {
        if ((string) ($connection['database'] ?? '') === '' || (string) ($connection['username'] ?? '') === '') {
            throw new RuntimeException('Неполные настройки MySQL для mysqldump.');
        }

        if (! $this->commandExists('mysqldump')) {
            throw new RuntimeException('На сервере не найден mysqldump. Установите mysql-client.');
        }
    }

    /**
     * @param  array<string, mixed>  $connection
     */
    private function assertSqliteReady(array $connection): void
    {
        $database = (string) ($connection['database'] ?? '');

        if ($database === '' || ! is_file($database)) {
            throw new RuntimeException('Файл SQLite не найден.');
        }

        if (! $this->commandExists('sqlite3')) {
            throw new RuntimeException('На сервере не найден sqlite3.');
        }
    }

    /**
     * @param  array<string, mixed>  $connection
     */
    private function streamPostgresDump(array $connection): void
    {
        $database = (string) ($connection['database'] ?? '');
        $username = (string) ($connection['username'] ?? '');
        $host = (string) ($connection['host'] ?? '127.0.0.1');
        $port = (string) ($connection['port'] ?? '5432');
        $password = (string) ($connection['password'] ?? '');

        if ($database === '' || $username === '') {
            throw new RuntimeException('Неполные настройки PostgreSQL для pg_dump.');
        }

        if (! $this->commandExists('pg_dump')) {
            throw new RuntimeException('На сервере не найден pg_dump. Установите postgresql-client.');
        }

        $this->echoHeader('pgsql', $database);

        $result = Process::timeout(600)
            ->env([
                'PGPASSWORD' => $password,
                'PGCLIENTENCODING' => 'UTF8',
            ])
            ->run([
                'pg_dump',
                '--host='.$host,
                '--port='.$port,
                '--username='.$username,
                '--dbname='.$database,
                '--no-owner',
                '--no-acl',
                '--clean',
                '--if-exists',
                '--format=p',
            ], function (string $type, string $output): void {
                if ($type === 'out') {
                    echo $output;
                }
            });

        if (! $result->successful()) {
            throw new RuntimeException(
                'pg_dump завершился с ошибкой: '.trim($result->errorOutput() ?: $result->output()),
            );
        }
    }

    /**
     * @param  array<string, mixed>  $connection
     */
    private function streamMysqlDump(array $connection): void
    {
        $database = (string) ($connection['database'] ?? '');
        $username = (string) ($connection['username'] ?? '');
        $host = (string) ($connection['host'] ?? '127.0.0.1');
        $port = (string) ($connection['port'] ?? '3306');
        $password = (string) ($connection['password'] ?? '');

        if ($database === '' || $username === '') {
            throw new RuntimeException('Неполные настройки MySQL для mysqldump.');
        }

        if (! $this->commandExists('mysqldump')) {
            throw new RuntimeException('На сервере не найден mysqldump. Установите mysql-client.');
        }

        $this->echoHeader('mysql', $database);

        $command = [
            'mysqldump',
            '--host='.$host,
            '--port='.$port,
            '--user='.$username,
            '--single-transaction',
            '--routines',
            '--triggers',
            '--add-drop-table',
            '--default-character-set=utf8mb4',
            $database,
        ];

        $result = Process::timeout(600)
            ->env([
                'MYSQL_PWD' => $password,
            ])
            ->run($command, function (string $type, string $output): void {
                if ($type === 'out') {
                    echo $output;
                }
            });

        if (! $result->successful()) {
            throw new RuntimeException(
                'mysqldump завершился с ошибкой: '.trim($result->errorOutput() ?: $result->output()),
            );
        }
    }

    /**
     * @param  array<string, mixed>  $connection
     */
    private function streamSqliteDump(array $connection): void
    {
        $database = (string) ($connection['database'] ?? '');

        if ($database === '' || ! is_file($database)) {
            throw new RuntimeException('Файл SQLite не найден.');
        }

        if (! $this->commandExists('sqlite3')) {
            throw new RuntimeException('На сервере не найден sqlite3.');
        }

        $this->echoHeader('sqlite', basename($database));

        $result = Process::timeout(600)
            ->run(['sqlite3', $database, '.dump'], function (string $type, string $output): void {
                if ($type === 'out') {
                    echo $output;
                }
            });

        if (! $result->successful()) {
            throw new RuntimeException(
                'sqlite3 .dump завершился с ошибкой: '.trim($result->errorOutput() ?: $result->output()),
            );
        }
    }

    private function echoHeader(string $driver, string $database): void
    {
        echo "-- Smart Planogram Control Center SQL dump\n";
        echo '-- Generated at: '.now()->toIso8601String()."\n";
        echo "-- Driver: {$driver}\n";
        echo "-- Database: {$database}\n";
        echo "-- Note: .env, storage files and Firebase credentials are NOT included.\n\n";
    }

    private function commandExists(string $binary): bool
    {
        $result = Process::run(['bash', '-lc', 'command -v '.escapeshellarg($binary)]);

        return $result->successful() && trim($result->output()) !== '';
    }
}
