<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('subscriptions:process')->dailyAt('06:00');
Schedule::command('products:bot-scan --limit=15')
    ->everyThirtySeconds()
    ->withoutOverlapping(2)
    ->runInBackground();
