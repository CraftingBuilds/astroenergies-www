<?php
// /music/astroenergies/api/local_tracks.php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$audioDir = realpath(__DIR__ . '/../audio');
if ($audioDir === false || !is_dir($audioDir)) {
  http_response_code(500);
  echo json_encode(["error" => "Audio directory not found", "path" => (__DIR__ . '/../audio')], JSON_PRETTY_PRINT);
  exit;
}

$allowed = ['wav','mp3','m4a','flac','ogg','aac','mp4'];

$files = scandir($audioDir);
if ($files === false) {
  http_response_code(500);
  echo json_encode(["error" => "Failed to read audio directory"], JSON_PRETTY_PRINT);
  exit;
}

$tracks = [];
foreach ($files as $f) {
  if ($f === '.' || $f === '..') continue;
  if ($f[0] === '.') continue; // ignore dotfiles

  $full = $audioDir . DIRECTORY_SEPARATOR . $f;
  if (!is_file($full)) continue;

  $ext = strtolower(pathinfo($f, PATHINFO_EXTENSION));
  if (!in_array($ext, $allowed, true)) continue;

  $title = pathinfo($f, PATHINFO_FILENAME);

  $tracks[] = [
    "title"   => $title,
    "release" => "",             // don’t lie with file timestamps
    "file"    => "audio/" . $f,  // relative to /music/astroenergies/
    "note"    => "Local master"
  ];
}

// Sort by filename/title for stable ordering
usort($tracks, function($a, $b) {
  return strcmp($a["title"], $b["title"]);
});

echo json_encode($tracks, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
