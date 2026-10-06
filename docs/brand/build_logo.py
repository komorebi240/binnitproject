"""Builds the Orbit logo from a handful of parameters and writes every file that carries it.

    python docs/brand/build_logo.py

Outputs (all paths relative to the repository root):
  frontend/src/components/brand/orbitLogoGeometry.ts   the numbers the React components draw from (and the intro animation)
  frontend/public/brand/*.svg                          master files: lockup (colour, reversed, black, white), mark, app icon
  frontend/src/app/icon.svg                            the favicon (the app icon)
  docs/brand/orbit-logo-guidelines.svg                 the one-page guideline sheet

The mark is a planet with a tilted ring that passes behind it above and in front of it below (a knock-out gap keeps the
two apart, so the mark works on any background) and one satellite riding the ring - "everything stays in orbit". The
wordmark is five custom geometric capitals drawn with the same stroke weight as the ring, so the lockup reads as one
piece and does not depend on a font being installed. Change a parameter below and run the script again.
"""
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

# --------------------------------------------------------------------------------------------------------------------
# Parameters (units are the logo's own grid; the lockup is about 180 x 31 units)
# --------------------------------------------------------------------------------------------------------------------
MARK = dict(
    planet_r=15.0,
    ring_rx=29.0,
    ring_ry=6.8,
    ring_tilt=-20.0,    # degrees, negative = the right end rises
    ring_stroke=4.2,
    gap=2.1,            # knock-out between the ring and the planet / satellite
    sat_r=3.9,
    sat_angle=-36.0,    # position on the ring (negative = the far side, behind the planet)
)
# The app icon needs a bolder mark: it is shown at 16 px.
ICON_MARK = dict(MARK, ring_ry=7.6, ring_stroke=5.6, gap=2.6, sat_r=4.8, sat_angle=-34.0)

CAP = 24.0            # cap height of the wordmark
STEM = 4.5            # stem weight of the wordmark
LOCKUP_GAP = 15.0     # between the mark and the word
GAPS = {"OR": 4.2, "RB": 4.4, "BI": 4.0, "IT": 3.8}   # optical spacing between the capitals
WORD = "ORBIT"

COLOURS = {
    "planet_from": "#4F46E5", "planet_to": "#7C3AED", "ring": "#7C3AED", "satellite": "#4F46E5", "word": "#312E81",
}
COLOURS_REVERSED = {
    "planet_from": "#6366F1", "planet_to": "#8B5CF6", "ring": "#A78BFA", "satellite": "#C4B5FD", "word": "#E0E7FF",
}


# --------------------------------------------------------------------------------------------------------------------
# Geometry
# --------------------------------------------------------------------------------------------------------------------
def num(value):
    text = f"{value:.2f}".rstrip("0").rstrip(".")
    return "0" if text in ("-0", "") else text


def rotate(x, y, degrees):
    a = math.radians(degrees)
    return x * math.cos(a) - y * math.sin(a), x * math.sin(a) + y * math.cos(a)


def mark_geometry(params):
    """The mark with its bounding box's top-left corner at the origin; also returns the bbox size."""
    r, rx, ry, tilt, sw = params["planet_r"], params["ring_rx"], params["ring_ry"], params["ring_tilt"], params["ring_stroke"]
    xs, ys = [], []
    for i in range(720):
        t = math.radians(i / 2)
        x, y = rotate(rx * math.cos(t), ry * math.sin(t), tilt)
        xs.append(x)
        ys.append(y)
    sat_x, sat_y = rotate(
        rx * math.cos(math.radians(params["sat_angle"])), ry * math.sin(math.radians(params["sat_angle"])), tilt
    )
    min_x = min(min(xs) - sw / 2, -r)
    max_x = max(max(xs) + sw / 2, r)
    min_y = min(min(ys) - sw / 2, -r, sat_y - params["sat_r"])
    max_y = max(max(ys) + sw / 2, r)
    ox, oy = -min_x, -min_y            # planet centre in the mark's own box
    left = rotate(-rx, 0, tilt)
    right = rotate(rx, 0, tilt)
    front = (
        f"M{num(ox + left[0])} {num(oy + left[1])}A{num(rx)} {num(ry)} {num(tilt)} 0 0 {num(ox + right[0])} {num(oy + right[1])}"
    )
    return dict(
        cx=ox, cy=oy, r=r, rx=rx, ry=ry, tilt=tilt, stroke=sw, gap=params["gap"], front=front,
        sat=(ox + sat_x, oy + sat_y), sat_r=params["sat_r"], width=max_x - min_x, height=max_y - min_y,
    )


def letter_paths():
    """Each capital as a path in its own box (top-left origin). Fill rule: non-zero (counters are wound the other way)."""
    h, w = CAP, STEM
    glyphs = {}
    glyphs["I"] = (w, h, 0.0, f"M0 0H{num(w)}V{num(h)}H0Z")
    wt = round(h * 0.9, 2)
    a, b = (wt - w) / 2, (wt + w) / 2
    glyphs["T"] = (wt, h, 0.0, f"M0 0H{num(wt)}V{num(w)}H{num(b)}V{num(h)}H{num(a)}V{num(w)}H0Z")
    overshoot = 0.6
    ro = h / 2 + overshoot
    ri = ro - w * 0.97
    glyphs["O"] = (
        2 * ro, 2 * ro, -overshoot,
        f"M0 {num(ro)}a{num(ro)} {num(ro)} 0 1 0 {num(2 * ro)} 0a{num(ro)} {num(ro)} 0 1 0 {num(-2 * ro)} 0Z"
        f"M{num(ro - ri)} {num(ro)}a{num(ri)} {num(ri)} 0 1 1 {num(2 * ri)} 0a{num(ri)} {num(ri)} 0 1 1 {num(-2 * ri)} 0Z",
    )
    wr, hb = round(h * 0.82, 2), round(h * 0.58, 2)
    rb = hb / 2
    ri_r = (hb - 2 * w) / 2
    xi = wr - w * 0.92 - ri_r
    lw, x0 = 6.0, wr * 0.47
    glyphs["R"] = (
        wr, h, 0.0,
        f"M0 0H{num(w)}V{num(h)}H0Z"
        f"M0 0H{num(wr - rb)}A{num(rb)} {num(rb)} 0 0 1 {num(wr - rb)} {num(hb)}H0Z"
        f"M{num(w)} {num(w)}V{num(hb - w)}H{num(xi)}A{num(ri_r)} {num(ri_r)} 0 0 0 {num(xi)} {num(w)}Z"
        f"M{num(x0 - lw / 2)} {num(hb - 0.8)}H{num(x0 + lw / 2)}L{num(wr)} {num(h)}H{num(wr - lw)}Z",
    )
    ht = round(h * 0.49, 2)
    hbb = h - ht
    rt, rbb = ht / 2, hbb / 2
    wt_, wb_ = round(h * 0.74, 2), round(h * 0.78, 2)
    tw = w * 0.92
    rit = (ht - w - w / 2) / 2
    xit = wt_ - tw - rit
    rib = (hbb - w - w / 2) / 2
    xib = wb_ - tw - rib
    glyphs["B"] = (
        wb_, h, 0.0,
        f"M0 0H{num(wt_ - rt)}A{num(rt)} {num(rt)} 0 0 1 {num(wt_ - rt)} {num(ht)}"
        f"H{num(wb_ - rbb)}A{num(rbb)} {num(rbb)} 0 0 1 {num(wb_ - rbb)} {num(h)}H0Z"
        f"M{num(w)} {num(w)}V{num(ht - w / 2)}H{num(xit)}A{num(rit)} {num(rit)} 0 0 0 {num(xit)} {num(w)}Z"
        f"M{num(w)} {num(ht + w / 2)}V{num(h - w)}H{num(xib)}A{num(rib)} {num(rib)} 0 0 0 {num(xib)} {num(ht + w / 2)}Z",
    )
    return glyphs


def lockup_geometry(mark_params=MARK):
    mark = mark_geometry(mark_params)
    glyphs = letter_paths()
    word_x = mark["width"] + LOCKUP_GAP
    word_top = mark["cy"] - CAP / 2          # the capitals are centred on the planet
    x = word_x
    letters = []
    for i, ch in enumerate(WORD):
        width, height, dy, d = glyphs[ch]
        letters.append(dict(char=ch, x=x, y=word_top + dy, width=width, height=height, d=d))
        x += width + (GAPS[WORD[i : i + 2]] if i < len(WORD) - 1 else 0)
    return dict(mark=mark, letters=letters, width=x, height=mark["height"], word_x=word_x, word_top=word_top)


# --------------------------------------------------------------------------------------------------------------------
# SVG
# --------------------------------------------------------------------------------------------------------------------
def mark_svg(m, uid, planet, ring, satellite, gradient=None, box=None):
    """The mark's elements. `planet` is a colour or None when `gradient` is given."""
    cx, cy = m["cx"], m["cy"]
    sx, sy = m["sat"]
    front = m["front"]
    bx, by, bw, bh = box or (-10, -10, m["width"] + 20, m["height"] + 20)
    defs = ""
    fill = planet
    if gradient:
        defs += (
            f'<linearGradient id="{uid}-g" gradientUnits="userSpaceOnUse" x1="{num(cx - m["r"])}" y1="{num(cy - m["r"])}" '
            f'x2="{num(cx + m["r"])}" y2="{num(cy + m["r"])}"><stop offset="0" stop-color="{gradient[0]}"/>'
            f'<stop offset="1" stop-color="{gradient[1]}"/></linearGradient>'
        )
        fill = f"url(#{uid}-g)"
    defs += (
        f'<mask id="{uid}-planet" maskUnits="userSpaceOnUse" x="{num(bx)}" y="{num(by)}" width="{num(bw)}" height="{num(bh)}">'
        f'<rect x="{num(bx)}" y="{num(by)}" width="{num(bw)}" height="{num(bh)}" fill="#fff"/>'
        f'<path d="{front}" fill="none" stroke="#000" stroke-width="{num(m["stroke"] + 2 * m["gap"])}"/></mask>'
        f'<mask id="{uid}-ring" maskUnits="userSpaceOnUse" x="{num(bx)}" y="{num(by)}" width="{num(bw)}" height="{num(bh)}">'
        f'<rect x="{num(bx)}" y="{num(by)}" width="{num(bw)}" height="{num(bh)}" fill="#fff"/>'
        f'<circle cx="{num(sx)}" cy="{num(sy)}" r="{num(m["sat_r"] + m["gap"])}" fill="#000"/></mask>'
    )
    body = (
        f'<ellipse cx="{num(cx)}" cy="{num(cy)}" rx="{num(m["rx"])}" ry="{num(m["ry"])}" '
        f'transform="rotate({num(m["tilt"])} {num(cx)} {num(cy)})" fill="none" stroke="{ring}" '
        f'stroke-width="{num(m["stroke"])}" mask="url(#{uid}-ring)"/>'
        f'<circle cx="{num(cx)}" cy="{num(cy)}" r="{num(m["r"])}" fill="{fill}" mask="url(#{uid}-planet)"/>'
        f'<path d="{front}" fill="none" stroke="{ring}" stroke-width="{num(m["stroke"])}"/>'
        f'<circle cx="{num(sx)}" cy="{num(sy)}" r="{num(m["sat_r"])}" fill="{satellite}"/>'
    )
    return defs, body


def lockup_svg(colours=None, mono=None, uid="orbit", title="Orbit"):
    g = lockup_geometry()
    m = g["mark"]
    if mono:
        defs, body = mark_svg(m, uid, mono, mono, mono)
        word = mono
    else:
        c = colours or COLOURS
        defs, body = mark_svg(m, uid, None, c["ring"], c["satellite"], gradient=(c["planet_from"], c["planet_to"]))
        word = c["word"]
    letters = "".join(f'<path transform="translate({num(l["x"])} {num(l["y"])})" d="{l["d"]}"/>' for l in g["letters"])
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {num(g["width"])} {num(g["height"])}" role="img" aria-label="{title}">'
        f"<title>{title}</title><defs>{defs}</defs>{body}<g fill=\"{word}\">{letters}</g></svg>\n"
    )


def mark_only_svg(colours=None, mono=None, uid="orbit-mark"):
    m = mark_geometry(MARK)
    if mono:
        defs, body = mark_svg(m, uid, mono, mono, mono)
    else:
        c = colours or COLOURS
        defs, body = mark_svg(m, uid, None, c["ring"], c["satellite"], gradient=(c["planet_from"], c["planet_to"]))
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {num(m["width"])} {num(m["height"])}" role="img" aria-label="Orbit">'
        f"<title>Orbit</title><defs>{defs}</defs>{body}</svg>\n"
    )


def app_icon_svg(uid="orbit-icon"):
    m = mark_geometry(ICON_MARK)
    size = 64
    scale = 46 / m["width"]
    # centre the mark's bounding box in the tile
    dx = (size - m["width"] * scale) / 2
    dy = (size - m["height"] * scale) / 2
    defs, body = mark_svg(m, uid, "#fff", "#fff", "#fff", box=(-10, -10, m["width"] + 20, m["height"] + 20))
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" role="img" aria-label="Orbit">'
        f'<title>Orbit</title><defs><linearGradient id="{uid}-bg" x1="0" y1="0" x2="1" y2="1">'
        f'<stop offset="0" stop-color="#4F46E5"/><stop offset="1" stop-color="#7C3AED"/></linearGradient>{defs}</defs>'
        f'<rect width="{size}" height="{size}" rx="14" fill="url(#{uid}-bg)"/>'
        f'<g transform="translate({num(dx)} {num(dy)}) scale({num(scale)})">{body}</g></svg>\n'
    )


# --------------------------------------------------------------------------------------------------------------------
# Geometry module for the React components
# --------------------------------------------------------------------------------------------------------------------
def geometry_ts():
    g = lockup_geometry()
    m = g["mark"]
    letters = ",\n".join(
        f'    {{ char: "{l["char"]}", x: {num(l["x"])}, y: {num(l["y"])}, width: {num(l["width"])}, height: {num(l["height"])},\n'
        f'      d: "{l["d"]}" }}'
        for l in g["letters"]
    )
    return f'''/**
 * Generated by docs/brand/build_logo.py - change the parameters there and run it again; do not edit by hand.
 * All numbers are in the lockup's own grid ({num(g["width"])} x {num(g["height"])}); `public/brand/*.svg` are drawn from the same data.
 */
export const LOGO = {{
  width: {num(g["width"])},
  height: {num(g["height"])},
  planet: {{ cx: {num(m["cx"])}, cy: {num(m["cy"])}, r: {num(m["r"])} }},
  ring: {{
    cx: {num(m["cx"])},
    cy: {num(m["cy"])},
    rx: {num(m["rx"])},
    ry: {num(m["ry"])},
    tilt: {num(m["tilt"])},
    strokeWidth: {num(m["stroke"])},
    /** The half of the ring that passes in front of the planet. */
    front: "{m["front"]}",
  }},
  satellite: {{ cx: {num(m["sat"][0])}, cy: {num(m["sat"][1])}, r: {num(m["sat_r"])} }},
  /** Knock-out between the ring and the planet, and between the satellite and the ring. */
  gap: {num(m["gap"])},
  text: {{ word: "{WORD}", capHeight: {num(CAP)}, stem: {num(STEM)} }},
  letters: [
{letters},
  ],
}} as const;
'''


# --------------------------------------------------------------------------------------------------------------------
# Guideline sheet
# --------------------------------------------------------------------------------------------------------------------
def guideline_sheet():
    g = lockup_geometry()
    m = g["mark"]
    W, H = 1200, 1500
    font = "font-family:Inter,Segoe UI,Arial,sans-serif"
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}"><rect width="{W}" height="{H}" fill="#F8F7FF"/>']
    defs = []

    def text(x, y, s, size=14, weight=400, fill="#312E81", anchor="start"):
        parts.append(f'<text x="{x}" y="{y}" text-anchor="{anchor}" style="{font};font-size:{size}px;font-weight:{weight}" fill="{fill}">{s}</text>')

    def lockup_at(x, y, width, variant, uid, bg=None, pad=0):
        scale = width / g["width"]
        if variant == "colour":
            d, b = mark_svg(m, uid, None, COLOURS["ring"], COLOURS["satellite"], gradient=(COLOURS["planet_from"], COLOURS["planet_to"]))
            word = COLOURS["word"]
        elif variant == "reversed":
            d, b = mark_svg(m, uid, None, COLOURS_REVERSED["ring"], COLOURS_REVERSED["satellite"], gradient=(COLOURS_REVERSED["planet_from"], COLOURS_REVERSED["planet_to"]))
            word = COLOURS_REVERSED["word"]
        else:
            d, b = mark_svg(m, uid, variant, variant, variant)
            word = variant
        defs.append(d)
        letters = "".join(f'<path transform="translate({num(l["x"])} {num(l["y"])})" d="{l["d"]}"/>' for l in g["letters"])
        parts.append(f'<g transform="translate({num(x)} {num(y)}) scale({num(scale)})">{b}<g fill="{word}">{letters}</g></g>')

    text(60, 76, "ORBIT - Logo guidelines", 34, 700)
    text(60, 106, "Everything stays in orbit.", 16, 400, "#6B7280")

    # 1 - construction and clear space
    text(60, 168, "1  Construction and clear space", 18, 700)
    x0, y0, w = 140, 250, 760
    scale = w / g["width"]
    x_unit = m["r"] * scale
    parts.append(f'<rect x="{num(x0 - x_unit)}" y="{num(y0 - x_unit)}" width="{num(w + 2 * x_unit)}" height="{num(g["height"] * scale + 2 * x_unit)}" fill="none" stroke="#8B5CF6" stroke-dasharray="6 6"/>')
    parts.append(f'<rect x="{x0}" y="{y0}" width="{num(w)}" height="{num(g["height"] * scale)}" fill="none" stroke="#C4B5FD"/>')
    lockup_at(x0, y0, w, "colour", "c1")
    cx, cy = x0 + m["cx"] * scale, y0 + m["cy"] * scale
    parts.append(f'<circle cx="{num(cx)}" cy="{num(cy)}" r="{num(x_unit)}" fill="none" stroke="#8B5CF6" stroke-dasharray="3 5"/>')
    text(x0 + w + x_unit + 24, y0 + 18, "X = the planet's radius.", 14, 600)
    text(x0 + w + x_unit + 24, y0 + 40, "Keep X free of text, edges", 14)
    text(x0 + w + x_unit + 24, y0 + 60, "and other graphics all round.", 14)
    text(x0 + w + x_unit + 24, y0 + 96, "Capitals: 24 high, stem 4.5,", 14)
    text(x0 + w + x_unit + 24, y0 + 116, "ring 4.2, planet radius 15.", 14)

    # 2 - versions
    text(60, 470, "2  Versions", 18, 700)
    cards = [("Full colour", "colour", "#FFFFFF"), ("Reversed (dark backgrounds)", "reversed", "#0F172A"), ("Black", "#111827", "#FFFFFF"), ("White", "#FFFFFF", "#4F46E5")]
    for i, (label, variant, bg) in enumerate(cards):
        cx0 = 60 + (i % 2) * 560
        cy0 = 500 + (i // 2) * 170
        parts.append(f'<rect x="{cx0}" y="{cy0}" width="540" height="150" rx="12" fill="{bg}" stroke="#DDD6FE"/>')
        lockup_at(cx0 + 70, cy0 + 56, 400, variant, f"v{i}")
        text(cx0 + 16, cy0 + 138, label, 12, 400, "#9CA3AF" if bg != "#FFFFFF" else "#6B7280")

    # 3 - minimum size
    text(60, 870, "3  Minimum size", 18, 700)
    for i, wpx in enumerate((96, 120, 160)):
        lockup_at(60 + i * 200, 905, wpx, "colour", f"s{i}")
        text(60 + i * 200, 905 + wpx * g["height"] / g["width"] + 30, f"{wpx} px" + ("  (minimum)" if i == 0 else ""), 12, 400, "#6B7280")
    text(700, 920, "Lockup: 96 px wide on screen (25 mm in print).", 14)
    text(700, 944, "Below that, use the app icon.", 14)
    text(700, 980, "Mark alone: 24 px.  App icon: from 16 px.", 14)

    # 4 - colours
    text(60, 1090, "4  Colour", 18, 700)
    swatches = [("Planet", "#4F46E5 to #7C3AED"), ("Ring", "#7C3AED"), ("Satellite", "#4F46E5"), ("Wordmark", "#312E81"), ("Ring (dark bg)", "#A78BFA"), ("Wordmark (dark bg)", "#E0E7FF")]
    for i, (label, hexes) in enumerate(swatches):
        sx = 60 + i * 190
        first = hexes.split(" ")[0]
        parts.append(f'<rect x="{sx}" y="1115" width="170" height="64" rx="10" fill="{first}" stroke="#DDD6FE"/>')
        text(sx, 1204, label, 13, 600)
        text(sx, 1224, hexes, 12, 400, "#6B7280")

    # 5 - misuse
    text(60, 1290, "5  Do not", 18, 700)
    misuse = ["Stretch or squash", "Rotate", "Recolour outside the palette", "Add shadows or outlines", "Place on busy or low-contrast backgrounds", "Redraw the letters or change the spacing"]
    for i, label in enumerate(misuse):
        mx = 60 + (i % 3) * 380
        my = 1320 + (i // 3) * 90
        parts.append(f'<circle cx="{mx + 12}" cy="{my + 8}" r="12" fill="#DC2626"/><path d="M{mx + 6} {my + 2}L{mx + 18} {my + 14}M{mx + 18} {my + 2}L{mx + 6} {my + 14}" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>')
        text(mx + 34, my + 13, label, 14)

    parts.insert(1, "<defs>" + "".join(defs) + "</defs>")
    parts.append("</svg>\n")
    return "".join(parts)


def write(path, content):
    path = ROOT / path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8", newline="\n")
    print("wrote", path.relative_to(ROOT))


if __name__ == "__main__":
    write("frontend/src/components/brand/orbitLogoGeometry.ts", geometry_ts())
    write("frontend/public/brand/orbit-logo.svg", lockup_svg())
    write("frontend/public/brand/orbit-logo-reversed.svg", lockup_svg(COLOURS_REVERSED, uid="orbit-r"))
    write("frontend/public/brand/orbit-logo-black.svg", lockup_svg(mono="#111827", uid="orbit-k"))
    write("frontend/public/brand/orbit-logo-white.svg", lockup_svg(mono="#FFFFFF", uid="orbit-w"))
    write("frontend/public/brand/orbit-mark.svg", mark_only_svg())
    write("frontend/public/brand/orbit-app-icon.svg", app_icon_svg())
    write("frontend/src/app/icon.svg", app_icon_svg("orbit-fav"))
    write("docs/brand/orbit-logo-guidelines.svg", guideline_sheet())
