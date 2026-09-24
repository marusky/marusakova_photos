// Scroll-driven effects that any page can opt into via classes / data attributes.
import { gsap, ScrollTrigger, SplitText, $, $$, lenis, reduced } from "./core.js";

const once = (trigger, start = "top 88%") => ({ trigger, start, once: true });

export function initSplits() {
  for (const el of $$("[data-split]")) {
    SplitText.create(el, {
      type: "lines",
      mask: "lines",
      linesClass: "split-line",
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.lines, {
          yPercent: 115,
          rotate: 2.5,
          transformOrigin: "0% 100%",
          duration: 1.4,
          stagger: 0.09,
          scrollTrigger: once(el),
        }),
    });
  }

  gsap.set("[data-fade]", { opacity: 0 });
  ScrollTrigger.batch("[data-fade]", {
    start: "top 92%",
    once: true,
    onEnter: (els) => gsap.fromTo(els, { opacity: 0, y: 28 }, { opacity: 1, y: 0, stagger: 0.08, duration: 1.2 }),
  });

  // Words darken as they scroll through the viewport; inline photos open up.
  for (const el of $$(".scrub-text")) {
    const split = SplitText.create(el, { type: "words" });
    const st = { trigger: el, start: "top 80%", end: "bottom 50%", scrub: true };
    gsap.fromTo(split.words, { opacity: 0.14 }, { opacity: 1, stagger: 0.1, ease: "none", scrollTrigger: st });
    gsap.from($$(".pill", el), { width: 0, marginInline: 0, ease: "none", scrollTrigger: { ...st, end: "center 55%" } });
  }
}

export function initImageReveals() {
  for (const pic of $$(".reveal-img")) {
    const img = $("img", pic);
    gsap
      .timeline({ scrollTrigger: once(pic, "top 90%") })
      .fromTo(pic, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.5, ease: "expo.inOut" })
      .fromTo(img, { scale: 1.35 }, { scale: 1, duration: 2, ease: "expo.out" }, 0.2);
  }
}

export function initParallax() {
  for (const pic of $$(".parallax-img")) {
    gsap.fromTo(
      pic,
      { yPercent: -7, scale: 1.16 },
      { yPercent: 7, ease: "none", scrollTrigger: { trigger: pic.parentElement, start: "top bottom", end: "bottom top", scrub: true } }
    );
  }

  const mm = gsap.matchMedia();
  mm.add("(min-width: 768px)", () => {
    // Gallery figures drift at slightly different speeds.
    for (const fig of $$("[data-gallery] [data-speed]")) {
      const s = Number(fig.dataset.speed);
      gsap.fromTo(
        fig,
        { y: () => s * innerHeight },
        { y: () => -s * innerHeight, ease: "none", scrollTrigger: { trigger: fig, start: "top bottom", end: "bottom top", scrub: true, invalidateOnRefresh: true } }
      );
    }
  });

  // Floating collage: every photo moves at its own pace through the section.
  for (const section of $$(".collage")) {
    for (const pic of $$("[data-speed]", section)) {
      const s = Number(pic.dataset.speed);
      gsap.fromTo(
        pic,
        { y: () => s * innerHeight },
        { y: () => -s * innerHeight * 1.4, ease: "none", scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: true, invalidateOnRefresh: true } }
      );
      gsap.from(pic, { opacity: 0, scale: 0.85, duration: 1.4, scrollTrigger: once(pic, "top 95%") });
    }
  }
}

export function initDarkSections() {
  for (const section of $$("[data-dark]")) {
    ScrollTrigger.create({
      trigger: section,
      start: "top 55%",
      end: "bottom 45%",
      onToggle: (self) => document.body.classList.toggle("is-dark", self.isActive),
    });
  }
}

export function initMarquee() {
  for (const marquee of $$(".marquee")) {
    const track = $(".marquee-track", marquee);
    const group = $(".marquee-group", track);
    track.append(group.cloneNode(true));
    if (reduced) continue;

    let x = 0;
    let dir = -1;
    let boost = 0;
    lenis?.on("scroll", ({ velocity, direction }) => {
      boost = Math.min(Math.abs(velocity) * 0.6, 30);
      if (direction) dir = direction === 1 ? -1 : 1;
    });
    let visible = false;
    ScrollTrigger.create({ trigger: marquee, start: "top bottom", end: "bottom top", onToggle: (s) => (visible = s.isActive) });
    gsap.ticker.add((_, delta) => {
      if (!visible) return;
      const width = group.offsetWidth;
      boost *= 0.92;
      x = gsap.utils.wrap(-width, 0, x + dir * (0.9 + boost) * (delta / 16.7));
      gsap.set(track, { x });
    });
  }
}

// Row of photos sliding sideways as the page scrolls.
export function initStrips() {
  for (const strip of $$(".strip")) {
    gsap.fromTo(
      $(".strip-track", strip),
      { x: () => innerWidth * 0.1 },
      {
        x: () => -($(".strip-track", strip).scrollWidth - innerWidth * 0.9),
        ease: "none",
        scrollTrigger: { trigger: strip, start: "top bottom", end: "bottom top", scrub: true, invalidateOnRefresh: true },
      }
    );
  }
}
