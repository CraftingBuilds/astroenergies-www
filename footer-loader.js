// music/astroenergies/footer-loader.js
document.addEventListener("DOMContentLoaded", async () => {
  const host = document.getElementById("footer-placeholder");
  if (!host) return;

  try {
    const res = await fetch("/footer.html", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} loading footer.html`);
    host.innerHTML = await res.text();
  } catch (e) {
    console.error("Footer loader failed:", e);
  }
});
