# Orbit logo

*Everything stays in orbit.*

The logo is a **mark** (a planet with a ring that passes behind it above and in front of it below, and one satellite
riding the ring) and a **wordmark** (five custom geometric capitals, drawn with the ring's stroke weight). Together they
form the **lockup**. See [orbit-logo-guidelines.svg](orbit-logo-guidelines.svg) for the one-page sheet.

## Files

| File | Use |
|---|---|
| `frontend/public/brand/orbit-logo.svg` | Lockup, full colour, for light backgrounds. The default. |
| `frontend/public/brand/orbit-logo-reversed.svg` | Lockup, full colour, for dark backgrounds. |
| `frontend/public/brand/orbit-logo-black.svg` / `-white.svg` | One-colour lockups (print, stamps, single-colour placements). |
| `frontend/public/brand/orbit-mark.svg` | The mark alone, 24 px and larger. |
| `frontend/public/brand/orbit-app-icon.svg` | The mark in white on the brand gradient, for app and social icons; the favicon (`frontend/src/app/icon.svg`) is the same drawing. Works from 16 px. |

All files are paths only (no fonts) and use SVG masks for the knock-outs, so they carry no background colour.

**Do not edit the SVGs or `orbitLogoGeometry.ts` by hand.** Change a parameter in `docs/brand/build_logo.py` and run:

```bash
python docs/brand/build_logo.py
```

It rewrites the master files, the favicon, the geometry the app draws and the guideline sheet in one go, and
`frontend/src/components/brand/orbitLogo.test.ts` fails if they ever disagree.

## Construction

Units are the logo grid (the lockup is 180 x 30.7).

* Planet radius **15**; ring 58 x 13.6 (rx 29, ry 6.8), tilted -20 degrees, stroke **4.2**; satellite radius 3.9 at -36 degrees on the ring.
* Knock-out gap **2.1** between ring and planet, and between satellite and ring.
* Capitals: cap height **24**, stem **4.5**, centred on the planet's centre; gap between mark and word **15**.
* The capitals share the ring's weight so the lockup reads as one piece.

## Clear space

Keep a margin of **X = the planet's radius** free of text, edges and other graphics on all sides.

## Minimum size

| Version | Minimum |
|---|---|
| Lockup | 96 px wide on screen (25 mm in print) |
| Mark alone | 24 px |
| App icon | 16 px |

In the app, use `OrbitWordmark` (`width` only: the height follows from the proportions).

## Colour

| Part | Light backgrounds | Dark backgrounds |
|---|---|---|
| Planet | `#4F46E5` to `#7C3AED` (diagonal) | `#6366F1` to `#8B5CF6` |
| Ring | `#7C3AED` | `#A78BFA` |
| Satellite | `#4F46E5` | `#C4B5FD` |
| Wordmark | `#312E81` | `#E0E7FF` |

In the web app these are the `--logo-*` variables in `frontend/src/app/globals.css`; the logo keeps the Orbit
indigo/violet on every theme, only the dark theme switches to the lighter set. One-colour versions use a single colour
(black or white) for every part.

## Do not

* Stretch, squash or rotate it.
* Recolour it outside the palette, or fill the planet with a pattern or photo.
* Add shadows, outlines or glows.
* Place it on busy or low-contrast backgrounds (use the reversed or one-colour version).
* Redraw the letters, change their spacing, or set "ORBIT" in a font next to the mark.
* Separate the satellite from the ring.
