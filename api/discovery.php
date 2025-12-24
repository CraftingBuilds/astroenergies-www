<?php
// /music/astroenergies/api/discovery.php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// This is the file your backend script will generate/update.
$catalogPath = __DIR__ . '/../data/discovery_catalog.json';

if (!file_exists($catalogPath)) {
  http_response_code(200);
  echo json_encode([
    "tracks" => [],
    "status" => "empty",
    "message" => "discovery_catalog.json not found yet. Run the backend script to generate it."
  ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
  exit;
}

$raw = file_get_contents($catalogPath);
if ($raw === false) {
  http_response_code(500);
  echo json_encode(["error" => "Failed to read discovery_catalog.json"]);
  exit;
}

echo $raw;
