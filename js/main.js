// music/astroenergies/js/main.js

const LOCAL_JSON = "data/local_tracks.json";
const APPLE_JSON = "data/apple_catalog.json";

const audioEl = document.getElementById("ae-audio");
const nowTitleEl = document.getElementById("ae-now-title");
const playlistEl = document.getElementById("ae-playlist");
const discographyEl = document.getElementById("ae-discography");

const yearEl = document.getElementById("ae-year");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

let localTracks = [];
let currentIndex = 0;

function safeText(s) {
  return String(s ?? "").trim();
}

function setNowPlaying(title) {
  if (nowTitleEl) nowTitleEl.textContent = title || "--";
}

function playIndex(idx) {
  if (!localTracks.length) return;
  currentIndex = Math.max(0, Math.min(idx, localTracks.length - 1));
  const t = localTracks[currentIndex];

  // Mark active
  [...playlistEl.querySelectorAll("li")].forEach((li) => li.classList.remove("active"));
  const active = playlistEl.querySelector(`li[data-index="${currentIndex}"]`);
  if (active) active.classList.add("active");

  audioEl.src = t.file;
  setNowPlaying(t.title);

  audioEl.play().catch(() => {
    // Autoplay often blocked; user can press play manually.
  });
}

function renderPlaylist() {
  playlistEl.innerHTML = "";
  localTracks.forEach((track, index) => {
    const li = document.createElement("li");
    li.dataset.index = String(index);
    li.innerHTML = `
      <span class="track-title">${safeText(track.title) || "Untitled"}</span>
      <span class="track-meta">${safeText(track.release) || "—"} · ${safeText(track.note) || "Local master"}</span>
    `;
    li.addEventListener("click", () => playIndex(index));
    playlistEl.appendChild(li);
  });

  if (localTracks.length) {
    // Default: first track queued but not forced autoplay
    playIndex(0);
    audioEl.pause();
  } else {
    setNowPlaying("--");
  }
}

function renderDiscovery(releases) {
  discographyEl.innerHTML = "";

  if (!Array.isArray(releases) || releases.length === 0) {
    discographyEl.innerHTML = `<div class="ae-release"><h3>No catalog found yet.</h3><div class="ae-release-meta">Run the backend sync script.</div></div>`;
    return;
  }

  releases.forEach((r) => {
    const card = document.createElement("div");
    card.className = "ae-release";

    const title = safeText(r.title) || "Untitled";
    const kind = safeText(r.kind) || "release";
    const date = safeText(r.releaseDate) || "—";
    const source = safeText(r.source) || "Apple Music";
    const url = safeText(r.url);

    card.innerHTML = `
      <h3>${title}</h3>
      <div class="ae-release-meta">${date} · ${kind} · ${source}</div>
      ${url ? `<a href="${url}" target="_blank" rel="noopener">Open on Apple Music</a>` : ``}
    `;

    discographyEl.appendChild(card);
  });
}

async function loadJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
  return res.json();
}

async function boot() {
  // Local
  try {
    const local = await loadJson(LOCAL_JSON);
    localTracks = Array.isArray(local) ? local : [];
  } catch (e) {
    console.warn("Local tracks JSON missing:", e);
    localTracks = [];
  }
  renderPlaylist();

  // Apple catalog
  try {
    const apple = await loadJson(APPLE_JSON);
    // expected: { releases: [...] }
    renderDiscovery(apple?.releases || []);
  } catch (e) {
    console.warn("Apple catalog JSON missing:", e);
    renderDiscovery([]);
  }

  // Auto-advance
  audioEl.addEventListener("ended", () => {
    if (!localTracks.length) return;
    const next = (currentIndex + 1) % localTracks.length;
    playIndex(next);
  });
}

boot();
