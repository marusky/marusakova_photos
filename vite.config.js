import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = import.meta.dirname;
const pages = Object.fromEntries(
  readdirSync(root)
    .filter((f) => f.endsWith(".html"))
    .map((f) => [f.replace(/\.html$/, ""), resolve(root, f)])
);

const loadPhotos = () => {
  try {
    return JSON.parse(readFileSync(resolve(root, "src/data/photos.json"), "utf8"));
  } catch {
    throw new Error("Missing src/data/photos.json - run `npm run images` first.");
  }
};

const attrs = (str) =>
  Object.fromEntries([...str.matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));

const escape = (s) => s.replace(/"/g, "&quot;");

// <x-photo src="album/name" sizes="50vw" class="…" img-class="…" alt="…" eager>
function picture(photos, a) {
  const p = photos[a.src];
  if (!p) throw new Error(`Unknown photo "${a.src}"`);
  const set = (fmt) => p.widths.map((w) => `img/${p.album}/${p.name}-${w}.${fmt} ${w}w`).join(", ");
  const fallback = `img/${p.album}/${p.name}-${p.widths.at(-2) ?? p.widths[0]}.webp`;
  const eager = "eager" in a;
  const extra = Object.entries(a)
    .filter(([k]) => k.startsWith("data-"))
    .map(([k, v]) => ` ${k}="${v}"`)
    .join("");
  return (
    `<picture class="${a.class ?? ""}" style="--lqip:url(${p.lqip})"${extra}>` +
    `<source type="image/avif" srcset="${set("avif")}" sizes="${a.sizes ?? "100vw"}">` +
    `<img src="${fallback}" srcset="${set("webp")}" sizes="${a.sizes ?? "100vw"}" ` +
    `width="${p.width}" height="${p.height}" alt="${escape(a.alt ?? "")}" ` +
    `class="${a["img-class"] ?? ""}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"` +
    `${a.data ? ` data-photo="${a.data}"` : ""}>` +
    `</picture>`
  );
}

// Editorial gallery: layout cycles through a pattern of spans/offsets so the
// grid feels hand-placed rather than uniform. Landscape shots go wide.
const LAYOUT = [
  "md:col-start-1 md:col-span-6",
  "md:col-start-8 md:col-span-5 md:mt-48",
  "md:col-start-2 md:col-span-4 md:-mt-24",
  "md:col-start-7 md:col-span-5 md:mt-24",
  "md:col-start-4 md:col-span-6",
  "md:col-start-1 md:col-span-5 md:mt-16",
  "md:col-start-8 md:col-span-4 md:mt-56",
];
const MOBILE = ["w-[88%]", "w-[72%] ml-auto", "w-full", "w-[80%] ml-[8%]"];
const SPEED = [0.08, -0.06, 0.12, -0.1, 0.05, 0.1, -0.08];

function gallery(photos, album, label) {
  const items = Object.values(photos).filter((p) => p.album === album);
  let slot = 0;
  return (
    `<div class="gallery grid grid-cols-1 md:grid-cols-12 gap-y-16 md:gap-x-8 md:gap-y-12" data-gallery>` +
    items
      .map((p, i) => {
        const wide = p.width > p.height;
        const cls = wide
          ? "md:col-start-2 md:col-span-10 md:my-16"
          : `${LAYOUT[slot++ % LAYOUT.length]}`;
        const mobile = wide ? "w-full" : MOBILE[i % MOBILE.length];
        const n = String(i + 1).padStart(2, "0");
        return (
          `<figure class="gallery-item ${mobile} md:w-auto md:ml-0 ${cls}" data-speed="${SPEED[i % SPEED.length]}">` +
          `<button type="button" class="block w-full overflow-hidden" data-lightbox="${i}" data-cursor="Zväčšiť" aria-label="Zväčšiť fotografiu ${i + 1}">` +
          picture(photos, {
            src: `${album}/${p.name}`,
            sizes: wide ? "(min-width: 768px) 80vw, 100vw" : "(min-width: 768px) 45vw, 90vw",
            class: "photo reveal-img block",
            alt: `${label} – fotografia ${i + 1}`,
            data: `img/${album}/${p.name}-${p.widths.at(-1)}.webp`,
          }) +
          `</button>` +
          `<figcaption class="mt-3 flex justify-between text-[11px] uppercase tracking-[0.2em] text-ink-muted"><span>N° ${n}</span><span>${label}</span></figcaption>` +
          `</figure>`
        );
      })
      .join("") +
    `</div>`
  );
}

function htmlIncludes() {
  let photos;
  return {
    name: "html-includes",
    buildStart() {
      photos = loadPhotos();
    },
    configureServer(server) {
      server.watcher.add([resolve(root, "src/partials"), resolve(root, "src/data")]);
      server.watcher.on("change", (file) => {
        if (file.includes("src/partials") || file.includes("src/data")) {
          photos = loadPhotos();
          server.ws.send({ type: "full-reload" });
        }
      });
    },
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        photos ??= loadPhotos();
        // Partials may themselves contain photos, so expand includes first.
        for (let i = 0; i < 3; i++) {
          html = html.replace(/<!--\s*@include\s+([\w-]+)\s*-->/g, (_, name) =>
            readFileSync(resolve(root, `src/partials/${name}.html`), "utf8")
          );
        }
        html = html.replace(/<!--\s*@gallery\s+([\w-]+)\s+"([^"]+)"\s*-->/g, (_, album, label) =>
          gallery(photos, album, label)
        );
        html = html.replace(/<x-photo\b([^>]*)><\/x-photo>/g, (_, a) => {
          const parsed = attrs(a);
          if (/\beager\b/.test(a)) parsed.eager = true;
          return picture(photos, parsed);
        });
        return html;
      },
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [htmlIncludes(), tailwindcss()],
  build: {
    rollupOptions: { input: pages },
    assetsInlineLimit: 0,
  },
});
