; Smart Planogram — Supervisor programs
; Placeholders: __APP_DIR__ __PHP_BIN__ __WEB_USER__

[program:sp-queue]
process_name=%(program_name)s_%(process_num)02d
command=__PHP_BIN__ __APP_DIR__/artisan queue:work redis --sleep=1 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=__WEB_USER__
numprocs=1
redirect_stderr=true
stdout_logfile=__APP_DIR__/storage/logs/queue-worker.log
stopwaitsecs=3600

[program:sp-reverb]
command=__PHP_BIN__ __APP_DIR__/artisan reverb:start --host=0.0.0.0 --port=8080
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=__WEB_USER__
redirect_stderr=true
stdout_logfile=__APP_DIR__/storage/logs/reverb.log
stopwaitsecs=10
