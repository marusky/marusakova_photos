// Site chrome shared by every page: images, cursor, menu, header, page transitions.
import { gsap, ScrollTrigger, $, $$, reduced, finePointer, stopScroll, startScroll, scrollTo, session } from "./core.js";

export function initImages() {
  for (const img of $$("picture img")) {
    const done = () => img.classList.add("is-loaded");
    if (img.complete && img.naturalWidth) done();
    else img.addEventListener("load", done, { once: true });
  }
}

// Custom cursor replaces the system one on mouse/trackpad devices: a small
// inverting dot that grows over links, or a labelled disc over [data-cursor].
export function initCursor() {
  if (!finePointer || reduced) return;
  const dot = $(".cursor-dot");
  const label = $(".cursor-label");
  dot.classList.remove("hidden");
  label.classList.remove("hidden");
  document.documentElement.classList.add("has-cursor");

  const dx = gsap.quickTo(dot, "x", { duration: 0.12, ease: "power3" });
  const dy = gsap.quickTo(dot, "y", { duration: 0.12, ease: "power3" });
  const lx = gsap.quickTo(label, "x", { duration: 0.45, ease: "power3" });
  const ly = gsap.quickTo(label, "y", { duration: 0.45, ease: "power3" });
  const interactive = "a, button, label, select, summary, [role=button], input[type=checkbox], input[type=radio]";
  let state = null;
  let lastTarget = null;

  const setState = (target) => {
    const labelled = target?.closest("[data-cursor]");
    const next = labelled ?? (target?.closest(interactive) ? "link" : null);
    if (next === state) return;
    state = next;
    if (labelled) {
      label.textContent = labelled.dataset.cursor;
      const invert = labelled.hasAttribute("data-cursor-invert");
      label.classList.toggle("is-invert", invert);
      gsap.to(label, { scale: invert ? 1.5 : 1, duration: 0.5, ease: "expo.out" });
      gsap.to(dot, { scale: 0, duration: 0.3 });
    } else {
      gsap.to(label, { scale: 0, duration: 0.4 });
      gsap.to(dot, { scale: next === "link" ? 3.2 : 1, duration: 0.4, ease: "expo.out" });
    }
  };

  window.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    dx(e.clientX);
    dy(e.clientY);
    lx(e.clientX);
    ly(e.clientY);
    lastTarget = e.target instanceof Element ? e.target : null;
    setState(lastTarget);
  }, { passive: true });
  document.documentElement.addEventListener("pointerleave", () => gsap.to([dot, label], { opacity: 0, duration: 0.3 }));
  document.documentElement.addEventListener("pointerenter", () => gsap.to([dot, label], { opacity: 1, duration: 0.3 }));
  window.addEventListener("pointerdown", () => gsap.to(dot, { scale: "*=0.7", duration: 0.15 }));
  window.addEventListener("pointerup", () => {
    state = undefined; // force the dot back to its hover size
    setState(lastTarget);
  });
}

export function initMenu() {
  const menu = $("#menu");
  const toggle = $(".menu-toggle");
  const toggleLabel = $(".menu-toggle-label");
  const [barTop, barBottom] = $$(".menu-bar");
  const previews = $$(".menu-preview", menu);
  let open = false;

  const tl = gsap
    .timeline({ paused: true, defaults: { ease: "expo.out" } })
    .set(menu, { visibility: "visible" })
    .fromTo(menu, { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.9, ease: "expo.inOut" })
    .to(barTop, { top: "50%", rotate: 45, duration: 0.5 }, 0.1)
    .to(barBottom, { bottom: "50%", rotate: -45, duration: 0.5 }, 0.1)
    .from($$(".menu-link", menu), { yPercent: 110, stagger: 0.06, duration: 1 }, 0.45)
    .from($$(".menu-fade", menu), { opacity: 0, y: 16, stagger: 0.06, duration: 0.8 }, 0.6)
    .from(menu.querySelector(".menu-previews"), { clipPath: "inset(100% 0% 0% 0%)", duration: 1.2, ease: "expo.inOut" }, 0.35);

  gsap.set(previews, { autoAlpha: 0 });
  gsap.set(previews[0], { autoAlpha: 1 });
  let shown = 0;
  $$(".menu-link", menu).forEach((link) =>
    link.addEventListener("pointerenter", () => {
      const i = Number(link.dataset.preview);
      if (i === shown) return;
      gsap.set(previews[i], { zIndex: 2 });
      gsap.set(previews[shown], { zIndex: 1 });
      gsap.fromTo(previews[i], { autoAlpha: 0, scale: 1.08 }, { autoAlpha: 1, scale: 1, duration: 0.9 });
      gsap.to(previews[shown], { autoAlpha: 0, duration: 0.9, delay: 0.1 });
      shown = i;
    })
  );

  const set = (state) => {
    open = state;
    toggle.setAttribute("aria-expanded", String(open));
    menu.setAttribute("aria-hidden", String(!open));
    toggleLabel.textContent = open ? "Zavrieť" : "Menu";
    if (open) {
      stopScroll();
      gsap.to(".site-header", { yPercent: 0, duration: 0.4 });
      tl.timeScale(1).play();
    } else {
      startScroll();
      tl.timeScale(1.5).reverse();
    }
  };
  toggle.addEventListener("click", () => set(!open));
  document.addEventListener("keydown", (e) => e.key === "Escape" && open && set(false));
}

export function initHeader() {
  const header = $(".site-header");
  let hidden = false;
  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate(self) {
      const hide = self.direction === 1 && self.scroll() > 240 && $("#menu").getAttribute("aria-hidden") === "true";
      if (hide === hidden) return;
      hidden = hide;
      gsap.to(header, { yPercent: hide ? -100 : 0, duration: 0.6, ease: "expo.out" });
    },
  });
}

// Curtain between pages: cover on leave, reveal on arrival.
const panel = () => $(".page-transition");

export function pageIn() {
  const covered = document.documentElement.classList.contains("pt");
  session.set("pt", null);
  if (!covered || reduced) {
    gsap.set(panel(), { yPercent: 100 });
    return Promise.resolve();
  }
  gsap.set(panel(), { yPercent: 0 });
  return new Promise((resolve) => {
    gsap.to(panel(), { yPercent: -100, duration: 1.1, ease: "expo.inOut", delay: 0.05 });
    gsap.delayedCall(0.45, resolve);
  });
}

export function initTransitions() {
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === "_blank" || a.hasAttribute("download")) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search) {
      if (!url.hash) {
        e.preventDefault();
        scrollTo(0);
      }
      return; // same-page anchors are handled by Lenis
    }
    if (reduced) return;
    e.preventDefault();
    session.set("pt", "1");
    gsap.fromTo(panel(), { yPercent: 100 }, {
      yPercent: 0,
      duration: 0.8,
      ease: "expo.inOut",
      onComplete: () => (location.href = url.href),
    });
  });
  // Restored from back/forward cache: make sure the curtain is gone.
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) gsap.set(panel(), { yPercent: 100 });
  });
}

export function initFooter() {
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
  $$("[data-scroll-top]").forEach((b) => b.addEventListener("click", () => scrollTo(0)));
}
