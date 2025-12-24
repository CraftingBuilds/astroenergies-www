// /music/astroenergies/js/discovery.js
const DISCOVERY_API = "/music/astroenergies/api/discovery.php";

function safe(s) {
  return String(s ?? "").trim();
}

function esc(s) {
  return safe(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function encodePath(path) {
  return safe(path)
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

function renderDiscovery(tracks) {
  const grid = document.getElementById("ae-discography");
  if (!grid) return;

  if (!Array.isArray(tracks) || tracks.length === 0) {
    grid.innerHTML = `<div class="ae-card"><div class="ae-card-title">No catalog items yet.</div></div>`;
    return;
  }

  grid.innerHTML = tracks.map((t) => {
    const title = esc(t.title || t.name || "Untitled");
    const release = esc(t.release || t.releaseDate || "");
    const url = safe(t.url || t.appleMusicUrl || "");
    const artwork = safe(t.artwork || t.cover || "");

    const artHtml = artwork
      ? `<img class="ae-card-art" src="${encodePath(artwork)}" alt="${title} cover" loading="lazy">`
      : `<div class="ae-card-art ae-card-art--placeholder"></div>`;

    const linkHtml = url
      ? `<a class="ae-button" href="${esc(url)}" target="_blank" rel="noopener">Open on Apple Music</a>`
      : ``;

    return `
      <div class="ae-card">
        ${artHtml}
        <div class="ae-card-title">${title}</div>
        <div class="ae-card-sub">${release}</div>
        <div class="ae-card-actions">${linkHtml}</div>
      </div>
    `;
  }).join("");
}

async function loadDiscovery() {
  const grid = document.getElementById("ae-discography");
  if (grid) grid.innerHTML = `<div class="ae-card"><div class="ae-card-title">Loading catalog…</div></div>`;

  try {
    const res = await fetch(DISCOVERY_API, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const tracks = Array.isArray(data) ? data : (Array.isArray(data.tracks) ? data.tracks : []);
    renderDiscovery(tracks);
  } catch (e) {
    console.error("Discovery load failed:", e);
    if (grid) grid.innerHTML = `<div class="ae-card"><div class="ae-card-title">Could not load catalog.</div></div>`;
  }
}

document.addEventListener("DOMContentLoaded", loadDiscovery);
