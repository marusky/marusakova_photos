// Fullscreen lightbox for [data-gallery] grids: keyboard, click zones and swipe.
import { gsap, $, $$, stopScroll, startScroll } from "./core.js";

export function initLightbox() {
  const gallery = $("[data-gallery]");
  const box = $(".lightbox");
  if (!gallery || !box) return;

  const triggers = $$("[data-lightbox]", gallery);
  const sources = triggers.map((b) => $("img", b));
  const img = $(".lightbox-img", box);
  const index = $("[data-lb-index]", box);
  $("[data-lb-total]", box).textContent = String(sources.length).padStart(2, "0");
  let cur = 0;
  let opener = null;

  const preload = (n) => (new Image().src = sources[(n + sources.length) % sources.length].dataset.photo);

  const show = (n, dir = 0) => {
    cur = (n + sources.length) % sources.length;
    const src = sources[cur];
    index.textContent = String(cur + 1).padStart(2, "0");
    gsap.to(img, {
      opacity: 0,
      x: -40 * dir,
      duration: dir ? 0.25 : 0,
      ease: "power2.in",
      onComplete: () => {
        img.src = src.dataset.photo;
        img.alt = src.alt;
        gsap.fromTo(img, { opacity: 0, x: 40 * dir, scale: dir ? 1 : 0.96 }, { opacity: 1, x: 0, scale: 1, duration: 0.9 });
      },
    });
    preload(cur + 1);
    preload(cur - 1);
  };

  const open = (n, trigger) => {
    opener = trigger;
    gsap.to(".cursor-label", { scale: 0, duration: 0.2 });
    box.classList.remove("hidden");
    stopScroll();
    document.documentElement.style.overflow = "hidden";
    gsap.fromTo(box, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power2.out" });
    show(n);
    $("[data-lb-close]", box).focus();
  };

  const close = () => {
    gsap.to(box, {
      opacity: 0,
      duration: 0.4,
      ease: "power2.in",
      onComplete: () => {
        box.classList.add("hidden");
        document.documentElement.style.overflow = "";
        startScroll();
        opener?.focus({ preventScroll: true });
      },
    });
  };

  triggers.forEach((b, i) => b.addEventListener("click", () => open(i, b)));
  $("[data-lb-close]", box).addEventListener("click", close);
  $("[data-lb-next]", box).addEventListener("click", () => show(cur + 1, 1));
  $("[data-lb-prev]", box).addEventListener("click", () => show(cur - 1, -1));
  document.addEventListener("keydown", (e) => {
    if (box.classList.contains("hidden")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowRight") show(cur + 1, 1);
    if (e.key === "ArrowLeft") show(cur - 1, -1);
  });

  let startX = null;
  box.addEventListener("touchstart", (e) => (startX = e.touches[0].clientX), { passive: true });
  box.addEventListener("touchend", (e) => {
    if (startX == null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    startX = null;
  });
}
