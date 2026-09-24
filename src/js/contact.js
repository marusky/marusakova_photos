// Contact form. Posts to the form's `action` when one is configured
// (Formspree, Netlify, own backend…); otherwise falls back to a mailto: draft.
import { gsap, $ } from "./core.js";

export function initContactForm() {
  const form = $("[data-contact]");
  if (!form) return;
  const status = $("[data-form-status]", form);
  const button = $("button[type=submit]", form);

  const say = (msg) => {
    status.textContent = msg;
    gsap.fromTo(status, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.8 });
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const endpoint = form.getAttribute("action");

    if (!endpoint) {
      const lines = [...data.entries()]
        .filter(([k, v]) => v && k !== "suhlas")
        .map(([k, v]) => `${k}: ${v}`);
      location.href = `mailto:${form.dataset.email}?subject=${encodeURIComponent(`Fotenie – ${data.get("typ") ?? "dopyt"}`)}&body=${encodeURIComponent(lines.join("\n"))}`;
      say("Otvoril sa vám e-mailový program s pripravenou správou. Stačí ju odoslať.");
      return;
    }

    button.disabled = true;
    try {
      const res = await fetch(endpoint, { method: "POST", body: data, headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(res.statusText);
      form.reset();
      say("Ďakujem! Správa dorazila, ozvem sa vám zvyčajne do 48 hodín.");
    } catch {
      say(`Správu sa nepodarilo odoslať. Skúste to prosím znova alebo napíšte priamo na ${form.dataset.email}.`);
    } finally {
      button.disabled = false;
    }
  });
}
