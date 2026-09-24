import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger, SplitText);
gsap.defaults({ ease: "expo.out", duration: 1.1 });

export { gsap, ScrollTrigger, SplitText };

export const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
export const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export let lenis = null;

export function initScroll() {
  if (reduced) return;
  lenis = new Lenis({ lerp: 0.085, anchors: { offset: 0 } });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

export const stopScroll = () => lenis?.stop();
export const startScroll = () => lenis?.start();
export const scrollTo = (target) =>
  lenis ? lenis.scrollTo(target, { duration: 1.6 }) : window.scrollTo({ top: 0, behavior: "smooth" });

export const session = {
  get: (k) => {
    try {
      return sessionStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k, v) => {
    try {
      v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v);
    } catch {}
  },
};
