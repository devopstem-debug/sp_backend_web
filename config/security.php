<?php

declare(strict_types=1);

return [
    'hsts' => env('SECURE_HEADERS_HSTS', false),

    /*
    | Extra CSP connect-src origins (comma-separated).
    | Example: wss://example.com:8080,https://api.example.com
    */
    'csp_connect_src_extra' => env('CSP_CONNECT_SRC_EXTRA', ''),

    /*
    | Extra CSP img-src origins (comma-separated).
    */
    'csp_img_src_extra' => env('CSP_IMG_SRC_EXTRA', ''),
];
