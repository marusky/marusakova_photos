import { initScroll, ScrollTrigger } from "./js/core.js";
import { initImages, initCursor, initMenu, initHeader, initTransitions, initFooter, pageIn } from "./js/ui.js";
import { initSplits, initImageReveals, initParallax, initDarkSections, initMarquee, initStrips } from "./js/reveals.js";
import { runPreloader, initHero, initHorizontal, initTestimonials } from "./js/home.js";
import { initLightbox } from "./js/gallery.js";
import { initContactForm } from "./js/contact.js";

document.documentElement.classList.add("js-ok");
initScroll();
initMarquee(); // clones photos, so before initImages
initImages();
initCursor();
initMenu();
initHeader();
initTransitions();
initFooter();
initLightbox();
initContactForm();

const heroEntrance = initHero();
initHorizontal();
initTestimonials();
initParallax();
initDarkSections();
initStrips();

await Promise.all([runPreloader(), pageIn()]);

// Reveal animations are created now so the ones already in view play
// after the curtain has lifted rather than behind it.
heroEntrance?.();
initSplits();
initImageReveals();
document.documentElement.classList.add("ready");

document.fonts?.ready.then(() => ScrollTrigger.refresh());
window.addEventListener("load", () => ScrollTrigger.refresh());
