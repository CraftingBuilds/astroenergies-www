// /music/astroenergies/js/main.js
const LOCAL_API = "/music/astroenergies/api/local_tracks.php";

const audioEl = document.getElementById("ae-audio");
const nowTitleEl = document.getElementById("ae-now-title");
const yearEl = document.getElementById("ae-year");
const prevBtn = document.getElementById("ae-prev");
const nextBtn = document.getElementById("ae-next");
const shuffleBtn = document.getElementById("ae-shuffle");
const playToggleBtn = document.getElementById("ae-play-toggle");
const progressEl = document.getElementById("ae-progress");
const timeEl = document.getElementById("ae-time");

if (yearEl) yearEl.textContent = String(new Date().getFullYear());

let tracks = [];
let currentIndex = 0;
let shuffleEnabled = false;

function safeText(s) {
  return String(s ?? "").trim();
}

function encodePath(path) {
  return safeText(path)
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

function modIndex(i) {
  if (!tracks.length) return 0;
  return (i + tracks.length) % tracks.length;
}

function setNowPlaying(title) {
  if (nowTitleEl) nowTitleEl.textContent = title || "--";
}

function fmtTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function updateTimeUi() {
  if (!audioEl || !timeEl || !progressEl) return;
  const current = audioEl.currentTime || 0;
  const duration = Number.isFinite(audioEl.duration) ? audioEl.duration : 0;
  const pct = duration > 0 ? (current / duration) * 100 : 0;

  progressEl.value = String(pct);
  timeEl.textContent = `${fmtTime(current)} / ${fmtTime(duration)}`;
function updateCarouselPosition() {
  if (!carouselEl) return;
  carouselEl.style.transform = `translateX(${-currentIndex * 100}%)`;
}

function updatePlayButtonUi() {
  if (!playToggleBtn || !audioEl) return;
  playToggleBtn.textContent = audioEl.paused ? "Play" : "Pause";
}

function updateShuffleUi() {
  if (!shuffleBtn) return;
  shuffleBtn.setAttribute("aria-pressed", String(shuffleEnabled));
  shuffleBtn.textContent = shuffleEnabled ? "Shuffle On" : "Shuffle Off";
}

function setIndex(i, { autoplay = false } = {}) {
  if (!tracks.length || !audioEl) return;
  currentIndex = modIndex(i);
  const t = tracks[currentIndex];

  setNowPlaying(safeText(t.title) || "--");
  audioEl.src = encodePath(t.file);
  audioEl.load();
  updateTimeUi();

  if (autoplay) {
    audioEl.play().catch(() => {});
  }
}

function togglePlayPause() {
  if (!audioEl || !tracks.length) return;
  if (audioEl.paused) {
    audioEl.play().catch(() => {});
  } else {
    audioEl.pause();
  }
}

function next() {
  if (!tracks.length) return;

  if (!shuffleEnabled || tracks.length < 2) {
    setIndex(currentIndex + 1, { autoplay: true });
    return;
  }

  let candidate = currentIndex;
  while (candidate === currentIndex) {
    candidate = Math.floor(Math.random() * tracks.length);
  }
  setIndex(candidate, { autoplay: true });
}

function prev() {
  if (!tracks.length) return;
  setIndex(currentIndex - 1, { autoplay: true });
function next() {
  if (!tracks.length) return;

  if (!shuffleEnabled || tracks.length < 2) {
    playIndex(currentIndex + 1, true);
    return;
  }

  let candidate = currentIndex;
  while (candidate === currentIndex) {
    candidate = Math.floor(Math.random() * tracks.length);
  }
  playIndex(candidate, true);
}

function prev() { playIndex(currentIndex - 1, true); }

function updateShuffleUi() {
  if (!shuffleBtn) return;
  shuffleBtn.setAttribute("aria-pressed", String(shuffleEnabled));
  shuffleBtn.textContent = shuffleEnabled ? "Shuffle: On" : "Shuffle: Off";
}

function toggleShuffle() {
  shuffleEnabled = !shuffleEnabled;
  updateShuffleUi();
}

function renderCarousel() {
  if (!carouselEl) return;
  carouselEl.innerHTML = "";

  tracks.forEach((t, i) => {
    const slide = document.createElement("div");
    slide.className = "ae-slide";
    slide.dataset.index = String(i);

    const title = safeText(t.title) || "Untitled";
    const cover = safeText(t.cover) || "img/astroenergies-logo.png";
    const release = safeText(t.release);

    slide.innerHTML = `
      <div class="ae-cover">
        <img src="${encodePath(cover)}" alt="${title} cover" loading="lazy" />
      </div>
      <div class="ae-slide-meta">
        <div class="ae-slide-title">${title}</div>
        <div class="ae-slide-sub">${release}</div>
      </div>
      <button class="ae-slide-play" type="button">Play</button>
    `;

    slide.querySelector(".ae-slide-play")?.addEventListener("click", (e) => {
      e.stopPropagation();
      playIndex(i, true);
    });

    slide.addEventListener("click", () => {
      setIndex(i, { preloadAudio: true });
    });

    carouselEl.appendChild(slide);
  });

  updateCarouselPosition();
  updateActiveSlide();
}

async function loadTracksFromApi() {
  try {
    const res = await fetch(LOCAL_API, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${LOCAL_API}`);

    const data = await res.json();
    const list = Array.isArray(data) ? data : [];

    tracks = list
      .map((t) => ({
        title: safeText(t.title),
        file: safeText(t.file),
      }))
      .filter((t) => t.file.length > 0);

    if (!tracks.length) {
      setNowPlaying("No local tracks found.");
      return;
    }

    setIndex(0, { autoplay: false });
    renderCarousel();

    currentIndex = 0;
    setIndex(currentIndex, { preloadAudio: true });
  } catch (e) {
    console.error("Player load failed:", e);
    setNowPlaying("Could not load local tracks (API).");
  }
}

prevBtn?.addEventListener("click", prev);
nextBtn?.addEventListener("click", next);
playToggleBtn?.addEventListener("click", togglePlayPause);
shuffleBtn?.addEventListener("click", toggleShuffle);
audioEl?.addEventListener("ended", next);
audioEl?.addEventListener("timeupdate", updateTimeUi);
audioEl?.addEventListener("loadedmetadata", updateTimeUi);
audioEl?.addEventListener("play", updatePlayButtonUi);
audioEl?.addEventListener("pause", updatePlayButtonUi);
audioEl?.addEventListener("contextmenu", (e) => e.preventDefault());

progressEl?.addEventListener("input", () => {
  if (!audioEl) return;
  const duration = Number.isFinite(audioEl.duration) ? audioEl.duration : 0;
  audioEl.currentTime = duration * (Number(progressEl.value) / 100);
});

updateShuffleUi();
updatePlayButtonUi();
updateTimeUi();
shuffleBtn?.addEventListener("click", toggleShuffle);
audioEl?.addEventListener("ended", next);
audioEl?.addEventListener("contextmenu", (e) => e.preventDefault());

updateShuffleUi();

document.addEventListener("keydown", (e) => {
  const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
  if (tag === "input" || tag === "textarea") return;
  if (e.code === "ArrowRight") next();
  if (e.code === "ArrowLeft") prev();
  if (e.code === "Space") {
    e.preventDefault();
    togglePlayPause();
  }
});

document.addEventListener("DOMContentLoaded", loadTracksFromApi);
