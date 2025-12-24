<?php
// /music/astroenergies/api/local_tracks.php
// Returns JSON array of tracks by scanning /music/astroenergies/audio/

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$audioDir = realpath(__DIR__ . '/../audio');
if ($audioDir === false || !is_dir($audioDir)) {
  http_response_code(500);
  echo json_encode(["error" => "Audio directory not found"]);
  exit;
}

// Allowed audio extensions (lowercase)
$allowed = ['wav','mp3','m4a','flac','ogg','aac'];

$files = scandir($audioDir);
if ($files === false) {
  http_response_code(500);
  echo json_encode(["error" => "Failed to read audio directory"]);
  exit;
}

$tracks = [];
foreach ($files as $f) {
  if ($f === '.' || $f === '..') continue;

  $full = $audioDir . DIRECTORY_SEPARATOR . $f;
  if (!is_file($full)) continue;

  $ext = strtolower(pathinfo($f, PATHINFO_EXTENSION));
  if (!in_array($ext, $allowed, true)) continue;

  $title = pathinfo($f, PATHINFO_FILENAME);

  // Optional: use file modified time as a "release" if you want something there.
  $mtime = @filemtime($full);
  $release = $mtime ? date('Y-m-d', $mtime) : '';

  $tracks[] = [
    "title"   => $title,
    "release" => $release,
    "file"    => "audio/" . $f,      // IMPORTANT: relative to /music/astroenergies/
    "note"    => "Local master"
  ];
}

// Sort alphabetically by title (you can change to newest-first if you want)
usort($tracks, function($a, $b) {
  return strcmp($a["title"], $b["title"]);
});

echo json_encode($tracks, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
