// /music/astroenergies/js/main.js
const LOCAL_API = "/music/astroenergies/api/local_tracks.php";

const audioEl = document.getElementById("ae-audio");
const nowTitleEl = document.getElementById("ae-now-title");
const yearEl = document.getElementById("ae-year");

const carouselEl = document.getElementById("ae-carousel");
const prevBtn = document.getElementById("ae-prev");
const nextBtn = document.getElementById("ae-next");

if (yearEl) yearEl.textContent = String(new Date().getFullYear());

let tracks = [];
let currentIndex = 0;

function safeText(s) {
  return String(s ?? "").trim();
}

function encodePath(path) {
  return safeText(path)
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

function setNowPlaying(title) {
  if (nowTitleEl) nowTitleEl.textContent = title || "--";
}

function modIndex(i) {
  if (!tracks.length) return 0;
  return (i + tracks.length) % tracks.length;
}

function saveIndex() {
  localStorage.setItem("ae_currentIndex", String(currentIndex));
}

function loadSavedIndex() {
  const n = parseInt(localStorage.getItem("ae_currentIndex") || "0", 10);
  return Number.isFinite(n) ? n : 0;
}

function updateCarouselPosition() {
  if (!carouselEl) return;
  carouselEl.style.transform = `translateX(${-currentIndex * 100}%)`;
}

function updateActiveSlide() {
  if (!carouselEl) return;
  [...carouselEl.querySelectorAll(".ae-slide")].forEach((el) => el.classList.remove("active"));
  const active = carouselEl.querySelector(`.ae-slide[data-index="${currentIndex}"]`);
  if (active) active.classList.add("active");
}

function setIndex(i, { preloadAudio = true } = {}) {
  currentIndex = modIndex(i);
  updateCarouselPosition();
  updateActiveSlide();

  const t = tracks[currentIndex];
  setNowPlaying(safeText(t.title) || "--");
  saveIndex();

  if (preloadAudio && audioEl) {
    audioEl.src = encodePath(t.file);
  }
}

function playIndex(i, autoplay = true) {
  if (!tracks.length || !audioEl) return;
  setIndex(i, { preloadAudio: true });

  if (autoplay) audioEl.play().catch(() => {});
}

function next() { playIndex(currentIndex + 1, true); }
function prev() { playIndex(currentIndex - 1, true); }

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
        release: safeText(t.release),
        note: safeText(t.note),
        file: safeText(t.file),
        cover: safeText(t.cover),
      }))
      .filter((t) => t.file.length > 0);

    if (!tracks.length) {
      setNowPlaying("No local tracks found.");
      return;
    }

    renderCarousel();

    currentIndex = modIndex(loadSavedIndex());
    setIndex(currentIndex, { preloadAudio: true });
  } catch (e) {
    console.error("Player load failed:", e);
    setNowPlaying("Could not load local tracks (API).");
  }
}

// controls
prevBtn?.addEventListener("click", prev);
nextBtn?.addEventListener("click", next);
audioEl?.addEventListener("ended", next);

document.addEventListener("keydown", (e) => {
  const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
  if (tag === "input" || tag === "textarea") return;
  if (e.code === "ArrowRight") next();
  if (e.code === "ArrowLeft") prev();
});

document.addEventListener("DOMContentLoaded", loadTracksFromApi);
