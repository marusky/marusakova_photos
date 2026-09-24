// Converts originals in photos/<album>/ into responsive AVIF + WebP variants
// in public/img/<album>/ and writes a manifest to src/data/photos.json.
// Photos whose content hash hasn't changed are skipped, so re-runs are fast
// (also in CI, where public/img is restored from cache).
import { readdir, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";

const SRC = "photos";
const OUT = "public/img";
const MANIFEST = "src/data/photos.json";
const WIDTHS = [480, 960, 1600, 2400];
const EXT = /\.(jpe?g|png|webp|tiff?)$/i;

const albums = (await readdir(SRC, { withFileTypes: true }))
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

const previous = existsSync(MANIFEST) ? JSON.parse(await readFile(MANIFEST, "utf8")) : {};
const manifest = {};
let generated = 0;

for (const album of albums) {
  const files = (await readdir(path.join(SRC, album)))
    .filter((f) => EXT.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  await mkdir(path.join(OUT, album), { recursive: true });

  for (const file of files) {
    const name = path.parse(file).name.toLowerCase();
    const input = path.join(SRC, album, file);
    const hash = createHash("sha1").update(await readFile(input)).digest("hex");
    const outputs = (e) => e.widths.flatMap((w) => ["avif", "webp"].map((f) => path.join(OUT, album, `${name}-${w}.${f}`)));
    const prev = previous[`${album}/${name}`];
    if (prev?.hash === hash && outputs(prev).every(existsSync)) {
      manifest[`${album}/${name}`] = prev;
      continue;
    }
    const base = sharp(input).rotate(); // apply EXIF orientation
    const meta = await base.metadata();
    const rotated = (meta.orientation ?? 1) >= 5;
    const width = rotated ? meta.height : meta.width;
    const height = rotated ? meta.width : meta.height;

    const widths = WIDTHS.filter((w) => w < width);
    if (widths.length < WIDTHS.length) widths.push(Math.min(width, WIDTHS.at(-1)));

    for (const w of widths) {
      for (const [fmt, opts] of [
        ["avif", { quality: 55, effort: 4 }],
        ["webp", { quality: 78 }],
      ]) {
        const out = path.join(OUT, album, `${name}-${w}.${fmt}`);
        await base.clone().resize({ width: w }).toFormat(fmt, opts).toFile(out);
        generated++;
      }
    }

    const lqip = await base.clone().resize({ width: 24 }).webp({ quality: 40 }).toBuffer();
    manifest[`${album}/${name}`] = {
      album,
      name,
      width,
      height,
      widths: [...new Set(widths)],
      hash,
      lqip: `data:image/webp;base64,${lqip.toString("base64")}`,
    };
    process.stdout.write(".");
  }
}

await mkdir(path.dirname(MANIFEST), { recursive: true });
await writeFile(MANIFEST, JSON.stringify(manifest, null, 2));
console.log(`\n${Object.keys(manifest).length} photos, ${generated} files generated`);
