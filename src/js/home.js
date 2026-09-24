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

  const first = $(".hero-slide img");
  const loaded = new Promise((res) => {
    if (first?.complete) return res();
    first?.addEventListener("load", res, { once: true });
    setTimeout(res, 3500);
  });
  const counter = { v: 0 };
  const count = $(".preloader-count");
  const counting = gsap.to(counter, {
    v: 100,
    duration: 2,
    ease: "power2.inOut",
    onUpdate: () => (count.textContent = Math.round(counter.v)),
  });

  return Promise.all([loaded, counting.then()]).then(
    () =>
      new Promise((resolve) => {
        gsap
          .timeline({ onComplete: () => (pre.remove(), startScroll()) })
          .to(pre.children, { opacity: 0, y: -30, duration: 0.6, stagger: 0.05, ease: "power2.in" })
          .to(pre, { yPercent: -100, duration: 1.1, ease: "expo.inOut" }, "-=0.2")
          .call(resolve, [], "-=0.7");
      })
  );
}

// Small photo frame sitting on the giant title; scrolling opens it to full screen.
function frameInset(hero, title) {
  const vw = innerWidth;
  const vh = hero.clientHeight;
  const h0 = hero.getBoundingClientRect().top;
  const t = title.getBoundingClientRect();
  let top, bottom, w;
  if (vw < 768) {
    // Phones: frame centred in the space above the title, title stays readable.
    const space = title.previousElementSibling.getBoundingClientRect().top - h0 - 16;
    const h = Math.min(space - 80, (vw - 40) * 1.35);
    w = h / 1.35;
    top = 80 + (space - 80 - h) / 2;
    bottom = top + h;
  } else {
    // Larger screens: frame overlaps the upper half of the giant name.
    bottom = t.top - h0 + t.height * 0.55;
    const h = Math.min(vh * 0.6, vw * 0.26 * 1.35);
    w = h / 1.35;
    top = bottom - h;
  }
  const side = (vw - w) / 2;
  return `inset(${top}px ${side}px ${vh - bottom}px ${side}px)`;
}

export function initHero() {
  const hero = $("[data-hero]");
  if (!hero) return () => {};
  const media = $(".hero-media", hero);
  const title = $(".hero-title", hero);
  const slides = $$(".hero-slide", hero);
  const overlay = $(".hero-overlay", hero);
  const chrome = $$(".hero-intro, .hero-scroll, [data-fade]", hero);

  gsap.set(media, { clipPath: frameInset(hero, title) });
  gsap.set(overlay, { zIndex: 5 });
  gsap.set(slides, { zIndex: 1, clipPath: "inset(100% 0% 0% 0%)" });
  gsap.set(slides[0], { zIndex: 2, clipPath: "inset(0% 0% 0% 0%)" });

  if (!reduced) {
    gsap
      .timeline({
        scrollTrigger: { trigger: hero, start: "top top", end: "+=140%", pin: true, scrub: true, invalidateOnRefresh: true },
      })
      .fromTo(media, { clipPath: () => frameInset(hero, title) }, { clipPath: "inset(0px 0px 0px 0px)", ease: "power2.inOut", duration: 1 })
      .fromTo(slides, { scale: 1.25 }, { scale: 1, ease: "power2.inOut", duration: 1 }, 0)
      .to(title, { yPercent: 35, opacity: 0, ease: "power1.in", duration: 0.6 }, 0)
      .to(chrome, { opacity: 0, duration: 0.25, ease: "none" }, 0)
      .to(overlay, { opacity: 1, duration: 0.3, ease: "none" }, 0.72)
      .from(overlay.children, { yPercent: 40, stagger: 0.05, duration: 0.3, ease: "power2.out" }, 0.72)
      .to({}, { duration: 0.15 });

    gsap.to($(".scroll-line", hero), { yPercent: 200, repeat: -1, duration: 1.6, ease: "expo.inOut" });
  }

  // Slideshow inside the frame.
  let i = 0;
  const next = () => {
    if (!document.hidden) {
      const prev = slides[i];
      i = (i + 1) % slides.length;
      const cur = slides[i];
      slides.forEach((s) => s !== prev && s !== cur && gsap.set(s, { zIndex: 1 }));
      gsap.set(prev, { zIndex: 2 });
      gsap.set(cur, { zIndex: 3 });
      gsap.fromTo(cur, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.5, ease: "expo.inOut" });
      gsap.fromTo($("img", cur), { scale: 1.25 }, { scale: 1, duration: 2.4, ease: "expo.out" });
    }
    gsap.delayedCall(3.4, next);
  };

  // Entrance, called once the preloader / page curtain is out of the way.
  return () => {
    const chars = SplitText.create(title, { type: "chars", mask: "chars" }).chars;
    const tl = gsap.timeline();
    tl.from(chars, { yPercent: 105, duration: 1.6, stagger: 0.045, ease: "expo.out" })
      .from(slides[0], { clipPath: "inset(100% 0% 0% 0%)", duration: 1.6, ease: "expo.inOut" }, 0.1)
      .from($("img", slides[0]), { scale: 1.5, duration: 2.2, ease: "expo.out" }, 0.3);
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
    gsap.to(items[cur], { autoAlpha: 0, y: -30 * dir, duration: 0.6, ease: "power2.in" });
    gsap.fromTo(items[next], { autoAlpha: 0, y: 40 * dir }, { autoAlpha: 1, y: 0, duration: 1.2, delay: 0.45 });
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
