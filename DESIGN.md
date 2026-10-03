# Portfolio design rules

- Use at most three typography styles per text font. A style includes weight, size, line height, and letter spacing. Use the named tokens in dist/style.css rather than adding one-off values.
- Geist: display (responsive 30–88px, regular, 1.05 line height, -.055em spacing); body (16px, regular, 1.65, zero spacing); UI (14px, regular, 1.2, zero spacing).
- Crimson Pro: editorial copy (24px, regular, 1.2, zero spacing); closing note (20px, regular, 1.3, zero spacing). All serif text is upright and no larger than 24px.
- Commit Mono: metadata (12px, regular, 1.6, zero spacing).
- The asterisk font is an icon asset, not a text family. Keep its glyphs monochrome.
- Use exactly these five UI palette tokens: surround #565c3a, paper #eeeede, ink #41482d, muted #777965, accent #c1c7a5. Apply them to text, surfaces, borders, icons, and interaction states. Photography is not recolored to fit the UI palette.
- Historical palette/type comparison pages are exploration artifacts, not the active portfolio design system.
- Preserve the full-viewport paper, internal scrolling, top index tabs, and folded About layout.
- Social icons are filled and use the same muted color as the vertical copyright. Footer asterisk uses accent.

- The ant lives in the existing bottom-right footer space. Never increase the footer height or enlarge the original 300×60 artwork. Fit proportionally into remaining space and reuse ink/paper colors.
- The interactive ASCII background (dist/ascii.js, ported from -ASCII-001-Hero v2) fills the surround behind the sheet and uses only palette tokens at low contrast: half-opacity muted resting dots, accent paint with muted rims, accent-to-muted sparks. Marks step through · • + ✦ ✳ ⁕ as paint builds and back down as it dries, drawn as hairline shapes so they match on every device.
