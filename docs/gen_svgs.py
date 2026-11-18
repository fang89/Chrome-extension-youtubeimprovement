#!/usr/bin/env python3
"""Generates the README images in docs/. Run: python3 docs/gen_svgs.py"""
from pathlib import Path

OUT = Path(__file__).parent
FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"


def t(x, y, s, size=16, fill="#fff", weight=400, anchor="start", extra=""):
    s = s.replace("&", "&amp;").replace("<", "&lt;")
    return (f'<text x="{x}" y="{y}" font-family="{FONT}" font-size="{size}" font-weight="{weight}" '
            f'fill="{fill}" text-anchor="{anchor}" {extra}>{s}</text>')


def pill(x, y, label, w):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="40" rx="20" fill="#fff" fill-opacity=".14" '
            f'stroke="#fff" stroke-opacity=".35"/>' + t(x + w / 2, y + 26, label, 17, weight=600, anchor="middle"))


def hero():
    p = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" width="1200" height="400" role="img">',
         '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1e1b4b"/>'
         '<stop offset="1" stop-color="#b91c1c"/></linearGradient></defs>',
         '<rect width="1200" height="400" rx="16" fill="url(#g)"/>',
         t(60, 118, "YouTube Gemini Summary", 50, weight=800),
         t(62, 160, "a summary of every video, right beside it", 22, "#fecaca")]
    x = 62
    for label, w in [("1. Open a video", 160), ("2. Wait ~7 s", 130), ("3. Read the summary", 196)]:
        p.append(pill(x, 200, label, w)); x += w + 14
    p.append(t(62, 290, "Chrome extension · uses YouTube's own Gemini · no API key", 15, "#fca5a5"))
    p.append(t(62, 314, "Free · open source · works on Chrome, Edge and Brave", 15, "#fca5a5"))

    # mini watch page
    X, Y = 720, 40
    p.append(f'<rect x="{X}" y="{Y}" width="440" height="320" rx="12" fill="#0f0f0f" stroke="#fff" stroke-opacity=".2"/>')
    p.append(f'<rect x="{X+16}" y="{Y+16}" width="250" height="140" rx="8" fill="#272727"/>')
    p.append(f'<path d="M{X+128} {Y+68} L{X+156} {Y+86} L{X+128} {Y+104} Z" fill="#fff" fill-opacity=".85"/>')
    p.append(f'<rect x="{X+16}" y="{Y+168}" width="220" height="12" rx="6" fill="#f1f1f1"/>')
    p.append(f'<rect x="{X+16}" y="{Y+188}" width="150" height="9" rx="4.5" fill="#717171"/>')
    for i, w in enumerate([46, 34, 34, 46]):
        bx = X + 16 + i * 54
        hl = i == 2
        p.append(f'<rect x="{bx}" y="{Y+208}" width="{w}" height="24" rx="12" fill="{"#7c3aed" if hl else "#272727"}"/>')
        if hl: p.append(t(bx + w / 2, Y + 225, "✦", 13, anchor="middle"))
    for i in range(3):
        p.append(f'<rect x="{X+16}" y="{Y+246+i*22}" width="{230-i*30}" height="8" rx="4" fill="#3f3f3f"/>')
    # summary card
    cx, cy = X + 280, Y + 16
    p.append(f'<rect x="{cx}" y="{cy}" width="144" height="196" rx="10" fill="#272727" stroke="#a78bfa" stroke-width="2"/>')
    p.append(t(cx + 10, cy + 22, "✨ Gemini summary", 11, weight=700))
    lines = [(118, None), (104, None), (122, None), (90, "0:42"), (116, None), (100, "3:15"), (120, None), (84, None), (110, "7:08"), (96, None)]
    for i, (w, ts) in enumerate(lines):
        yy = cy + 38 + i * 15
        if ts:
            p.append(f'<rect x="{cx+10}" y="{yy}" width="26" height="9" rx="4.5" fill="#3ea6ff"/>')
            p.append(f'<rect x="{cx+40}" y="{yy}" width="{w-30}" height="7" rx="3.5" fill="#aaa"/>')
        else:
            p.append(f'<rect x="{cx+10}" y="{yy}" width="{w}" height="7" rx="3.5" fill="#aaa"/>')
    for i in range(3):
        p.append(f'<rect x="{cx}" y="{cy+208+i*32}" width="56" height="26" rx="4" fill="#272727"/>')
        p.append(f'<rect x="{cx+62}" y="{cy+212+i*32}" width="80" height="7" rx="3.5" fill="#3f3f3f"/>')
    p.append("</svg>")
    return "".join(p)


def download():
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 112" width="520" height="112" role="img" '
            'aria-label="Download the extension"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
            '<stop offset="0" stop-color="#dc2626"/><stop offset="1" stop-color="#991b1b"/></linearGradient>'
            '<filter id="s" x="-10%" y="-20%" width="120%" height="150%"><feDropShadow dx="0" dy="4" stdDeviation="5" '
            'flood-color="#000" flood-opacity=".25"/></filter></defs>'
            '<rect x="10" y="8" width="500" height="88" rx="44" fill="url(#g)" filter="url(#s)"/>'
            '<circle cx="62" cy="52" r="26" fill="#fff" fill-opacity=".2"/>'
            '<path d="M62 36 V62 M51 52 L62 63 L73 52 M50 68 H74" stroke="#fff" stroke-width="4" fill="none" '
            'stroke-linecap="round" stroke-linejoin="round"/>'
            + t(290, 56, "Download the extension", 30, weight=800, anchor="middle")
            + t(290, 80, "Free · no API key · Chrome, Edge, Brave", 15, "#fee2e2", 500, "middle") + "</svg>")


def flow():
    W, H = 1200, 260
    steps = [
        ("1", "You open a video", "any youtube.com/watch page,", "or click on to the next one"),
        ("2", "It clicks ✦ Ask", "YouTube's own Gemini panel,", "kept off-screen"),
        ("3", "Summarize video", "waits until the answer is", "finished (👍👎 row appears)"),
        ("4", "Card on the right", "copied in, panel closed,", "saved for next time"),
    ]
    p = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img">',
         f'<rect width="{W}" height="{H}" rx="16" fill="#f8fafc" stroke="#e2e8f0"/>']
    bw, gap, x0 = 250, 46, 28
    for i, (n, title, l1, l2) in enumerate(steps):
        x = x0 + i * (bw + gap)
        fill = "#ede9fe" if i in (1, 2) else "#fee2e2"
        stroke = "#7c3aed" if i in (1, 2) else "#dc2626"
        p.append(f'<rect x="{x}" y="40" width="{bw}" height="150" rx="14" fill="{fill}" stroke="{stroke}" stroke-width="2"/>')
        p.append(f'<circle cx="{x+30}" cy="72" r="17" fill="{stroke}"/>' + t(x + 30, 78, n, 17, weight=800, anchor="middle"))
        p.append(t(x + 56, 79, title, 19, "#0f172a", 700))
        p.append(t(x + 20, 124, l1, 15, "#334155"))
        p.append(t(x + 20, 146, l2, 15, "#334155"))
        if i < 3:
            ax = x + bw + 6
            p.append(f'<path d="M{ax} 115 H{ax+gap-14} M{ax+gap-22} 107 L{ax+gap-12} 115 L{ax+gap-22} 123" '
                     f'stroke="#64748b" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>')
    p.append(t(W / 2, 228, "About 6–7 seconds per video · the whole thing runs inside your own YouTube tab", 16, "#475569", anchor="middle"))
    p.append("</svg>")
    return "".join(p)


for name, fn in [("hero", hero), ("download", download), ("flow", flow)]:
    (OUT / f"{name}.svg").write_text(fn())
    print("wrote", name)
