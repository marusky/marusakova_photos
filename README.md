# Marušáková photos

Portfólio fotografky. Statické HTML + Tailwind CSS v4 + vanilla JS (GSAP, Lenis), build cez Vite.

## Vývoj

```bash
npm install
npm run dev      # spracuje fotky a spustí dev server na http://localhost:5173
npm run build    # produkčný build do dist/
```

## Fotky

Originály patria do `photos/<album>/` (`svadby`, `rodiny`, `tehotenske`, `parove`, `portrety`, `vyber`).
`npm run images` z nich vyrobí AVIF + WebP v rôznych šírkach do `public/img/` a manifest
`src/data/photos.json` (obe sú generované, nie sú v gite). Galéria na stránke kategórie
sa poskladá automaticky zo všetkých fotiek v albume, v poradí podľa názvu súboru.

Stačí exportovať JPG s dlhšou stranou aspoň ~2400 px.

## Šablóny

Vite plugin vo `vite.config.js` pri builde nahrádza:

- `<!-- @include header -->` – obsah `src/partials/header.html`
- `<!-- @gallery svadby "Svadby" -->` – celá galéria albumu
- `<x-photo src="svadby/3" sizes="50vw" class="…" alt="…"></x-photo>` – responzívny `<picture>`

## Štruktúra

```
*.html              stránky (index, svadby, rodiny, tehotenske, parove, portrety, o-mne, kontakt)
src/partials/       hlavička + menu, pätička + lightbox, <head>
src/styles.css      Tailwind téma (farby, fonty) a komponenty
src/js/             animácie a interakcie
photos/             originály fotiek
scripts/            spracovanie fotiek
```
