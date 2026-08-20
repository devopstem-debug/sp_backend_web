<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="utf-8">
    <title>{{ $document->title }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #111; line-height: 1.45; }
        h1 { font-size: 18px; }
        .muted { color: #555; margin-bottom: 16px; }
        p { margin: 0 0 8px; white-space: pre-wrap; }
    </style>
</head>
<body>
    <h1>{{ $document->title }}</h1>
    <p class="muted">Версия {{ $document->version }}</p>
    <div>{!! nl2br(e($document->content)) !!}</div>
</body>
</html>
