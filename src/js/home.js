// Home page: preloader, expanding hero, horizontal portfolio, testimonials.
import { gsap, ScrollTrigger, SplitText, $, $$, reduced, stopScroll, startScroll, session } from "./core.js";

export function runPreloader() {
  const pre = $(".preloader");
  if (!pre) return Promise.resolve();
  if (reduced || session.get("seen") || document.documentElement.classList.contains("pt")) {
    pre.remove();
    return Promise.resolve();
  }
  session.set("seen", "1");
  pre.classList.replace("hidden", "flex");
  stopScroll();

  const mark = $(".preloader-mark", pre);
  const bar = $(".preloader-bar", pre);
  const pulse = gsap.fromTo(mark, { opacity: 1 }, { opacity: 0.35, duration: 0.9, ease: "sine.inOut", repeat: -1, yoyo: true });

  // The line follows the first hero photo; it never takes less than ~1s or more than ~4s.
  const first = $(".hero-slide img");
  const loaded = new Promise((res) => {
    if (first?.complete) return res();
    first?.addEventListener("load", res, { once: true });
    first?.addEventListener("error", res, { once: true });
    setTimeout(res, 4000);
  });
  const progress = gsap.to(bar, { scaleX: 0.8, duration: 3, ease: "power2.out" });

  return Promise.all([loaded, new Promise((r) => setTimeout(r, 900))]).then(
    () =>
      new Promise((resolve) => {
        progress.kill();
        gsap
          .timeline({ onComplete: () => (pulse.kill(), pre.remove(), startScroll()) })
          .to(bar, { scaleX: 1, duration: 0.45, ease: "power2.inOut" })
          .to(mark, { opacity: 0, y: -16, duration: 0.5, ease: "power2.in" }, "+=0.05")
          .to(bar.parentElement, { opacity: 0, duration: 0.4 }, "<")
          .to(pre, { yPercent: -100, duration: 1, ease: "expo.inOut" }, "-=0.15")
          .call(resolve, [], "-=0.6");
      })
  );
}

// Where the small portrait frame sits before scrolling.
function frameRect(hero, title) {
  const vw = innerWidth;
  const vh = hero.clientHeight;
  // offsetTop ignores transforms, so this is stable even mid-animation.
  const block = title.parentElement;
  const titleTop = block.offsetTop + title.offsetTop;
  let y, h;
  if (vw < 768) {
    // Phones: centred above the title so the name stays readable.
    const space = block.offsetTop + title.previousElementSibling.offsetTop - 16;
    h = Math.min(space - 80, (vw - 48) * 1.35);
    y = 80 + (space - 80 - h) / 2;
  } else {
    // Larger screens: overlaps the upper half of the giant name.
    h = Math.min(vh * 0.58, vw * 0.25 * 1.35);
    y = titleTop + title.offsetHeight * 0.55 - h;
  }
  const w = h / 1.35;
  return { x: (vw - w) / 2, y, w, h };
}

const whenLoaded = (img) =>
  img.complete && img.naturalWidth
    ? Promise.resolve()
    : new Promise((res) => {
        img.loading = "eager";
        img.addEventListener("load", res, { once: true });
        img.addEventListener("error", res, { once: true });
      });

const lerp = (a, b, t) => a + (b - a) * t;

export function initHero() {
  const hero = $("[data-hero]");
  if (!hero) return () => {};
  const media = $(".hero-media", hero);
  const stage = $(".hero-stage", hero);
  const title = $(".hero-title", hero);
  const slides = $$(".hero-slide", hero);
  const overlay = $(".hero-overlay", hero);
  const chrome = $$(".hero-intro, .hero-scroll, [data-fade]", hero);

  // The photo is never cropped by CSS: the stage holds it at its natural 2:3
  // shape and is only moved/scaled (GPU), while the frame is a rectangular clip.
  // At every step the photo "covers" the current rectangle, like object-fit:
  // cover with a focal point 35% from the top – so the small frame shows almost
  // the whole picture and the full-screen state shows its most important band.
  const FOCUS_Y = 0.35;
  const state = { t: 0, reveal: 1 };
  let from, vw, vh, photoH;
  const measure = () => {
    vw = innerWidth;
    vh = hero.clientHeight;
    photoH = stage.offsetHeight;
    from = frameRect(hero, title);
  };
  const render = () => {
    const t = state.t;
    const x = lerp(from.x, 0, t);
    const y = lerp(from.y, 0, t);
    const w = lerp(from.w, vw, t);
    const h = lerp(from.h, vh, t);
    const scale = Math.max(w / vw, h / photoH);
    const tx = x + (w - vw * scale) / 2;
    const ty = y + (h - photoH * scale) * FOCUS_Y;
    const top = y + h * (1 - state.reveal);
    media.style.clipPath = `inset(${top}px ${vw - x - w}px ${vh - y - h}px ${x}px)`;
    stage.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  };
  measure();
  render();
  ScrollTrigger.addEventListener("refreshInit", measure);
  ScrollTrigger.addEventListener("refresh", render);

  gsap.set(slides, { autoAlpha: 0 });
  gsap.set(slides[0], { autoAlpha: 1 });

  if (!reduced) {
    gsap
      .timeline({
        scrollTrigger: { trigger: hero, start: "top top", end: "+=140%", pin: true, scrub: true, anticipatePin: 1 },
      })
      .to(state, { t: 1, ease: "power2.inOut", duration: 1, onUpdate: render }, 0)
      .to(title, { yPercent: 35, opacity: 0, ease: "power1.in", duration: 0.6 }, 0)
      .to(chrome, { opacity: 0, duration: 0.25, ease: "none" }, 0)
      .to(overlay, { opacity: 1, duration: 0.3, ease: "none" }, 0.72)
      .from(overlay.children, { yPercent: 40, stagger: 0.05, duration: 0.3, ease: "power2.out" }, 0.72)
      .to({}, { duration: 0.15 });

    gsap.to($(".scroll-line", hero), { yPercent: 200, repeat: -1, duration: 1.6, ease: "expo.inOut" });
  } else {
    addEventListener("resize", () => (measure(), render()));
  }

  // Slideshow: crossfades only while the hero is on screen, and only to a photo that has loaded.
  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(hero);
  let i = 0;
  const next = async () => {
    const n = (i + 1) % slides.length;
    whenLoaded($("img", slides[(n + 1) % slides.length])); // warm up the one after
    if (visible && !document.hidden) {
      await whenLoaded($("img", slides[n]));
      const prev = slides[i];
      const cur = slides[n];
      i = n;
      gsap.set(cur, { zIndex: 2 });
      gsap.set(prev, { zIndex: 1 });
      gsap.fromTo(cur, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.3, ease: "power2.inOut", onComplete: () => gsap.set(prev, { autoAlpha: 0 }) });
      gsap.fromTo($("img", cur), { scale: 1.06 }, { scale: 1, duration: 3, ease: "power2.out" });
    }
    gsap.delayedCall(3.8, next);
  };

  // Entrance, called once the preloader / page curtain is out of the way.
  return () => {
    const chars = SplitText.create(title, { type: "chars", mask: "chars" }).chars;
    state.reveal = 0;
    render();
    const tl = gsap.timeline();
    tl.from(chars, { yPercent: 105, duration: 1.6, stagger: 0.045, ease: "expo.out" })
      .to(state, { reveal: 1, duration: 1.6, ease: "expo.inOut", onUpdate: render }, 0.1)
      .from($("img", slides[0]), { scale: 1.15, duration: 2.4, ease: "expo.out" }, 0.3);
    gsap.delayedCall(4, next);
    return tl;
  };
}

export function initHorizontal() {
  const section = $("[data-hscroll]");
  if (!section) return;
  const track = $(".hscroll-track", section);
  const cards = $$(".hcard", section);
  const mm = gsap.matchMedia();

  mm.add("(min-width: 768px)", () => {
    if (reduced) {
      section.querySelector(".hscroll-pin").style.overflowX = "auto";
      return;
    }
    const distance = () => track.scrollWidth - innerWidth;
    const tween = gsap.to(track, {
      x: () => -distance(),
      ease: "none",
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: () => `+=${distance()}`,
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });
    for (const card of cards) {
      const pic = $(".hcard-img", card);
      gsap.fromTo(
        pic,
        { xPercent: 9, scale: 1.2 },
        { xPercent: -9, ease: "none", scrollTrigger: { trigger: card, containerAnimation: tween, start: "left right", end: "right left", scrub: true } }
      );
    }
  });

  mm.add("(max-width: 767px)", () => {
    for (const card of cards) {
      gsap.from(card, { opacity: 0, y: 60, duration: 1.3, scrollTrigger: { trigger: card, start: "top 90%", once: true } });
    }
  });
}

export function initTestimonials() {
  const root = $("[data-testimonials]");
  if (!root) return;
  const items = $$(".t-item", root);
  const index = $("[data-t-index]", root);
  $("[data-t-total]", root).textContent = String(items.length).padStart(2, "0");
  let cur = 0;
  let timer;

  const show = (n, dir = 1) => {
    const next = (n + items.length) % items.length;
    if (next === cur) return;
    // Rapid clicks: drop any running fades so only two quotes are ever involved.
    gsap.killTweensOf(items);
    items.forEach((it, k) => k !== cur && gsap.set(it, { autoAlpha: 0, y: 0 }));
    gsap
      .timeline()
      .to(items[cur], { autoAlpha: 0, y: -24 * dir, duration: 0.35, ease: "power2.in" })
      .fromTo(items[next], { autoAlpha: 0, y: 32 * dir }, { autoAlpha: 1, y: 0, duration: 0.9, ease: "expo.out" });
    cur = next;
    index.textContent = String(cur + 1).padStart(2, "0");
    schedule();
  };
  const schedule = () => {
    timer?.kill();
    timer = gsap.delayedCall(8, () => show(cur + 1));
  };

  gsap.set(items.slice(1), { autoAlpha: 0 });
  $("[data-t-next]", root).addEventListener("click", () => show(cur + 1, 1));
  $("[data-t-prev]", root).addEventListener("click", () => show(cur - 1, -1));
  ScrollTrigger.create({
    trigger: root,
    start: "top bottom",
    end: "bottom top",
    onToggle: (s) => (s.isActive ? schedule() : timer?.kill()),
  });
}
