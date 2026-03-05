### Users
DFINITY design team members who configure and export procedural SVG fragment patterns for use across Internet Computer web properties. They use this tool to explore parameter spaces, preview animations, and export configs/assets. Internal tooling — function over compliance, but quality matters.

### Brand Personality
**Bold, digital, futuristic.** The tool should feel like a precision instrument for digital craft — confident, forward-looking, and distinctly technical without being cold.

### Aesthetic Direction
- **Theme:** Dark-mode only. Glassmorphism with black/translucent backgrounds, backdrop blur, and subtle white borders.
- **Typography:** Inter Tight 300 (light weight). Clean, geometric, modern.
- **Color palette:** Monochromatic white-on-black. Color comes from the generated fragments themselves, not the UI chrome. Accent sparingly if needed — never neon or gradient-heavy.
- **References:** Linear, Raycast — minimal, dark, extremely polished, keyboard-friendly.
- **Anti-references:** Generic Bootstrap/Material admin dashboards. Crypto/Web3 neon glow aesthetic. Notion-like plain text-heavy minimalism. The UI should have visual interest and precision without resorting to cheap effects.
- **Components:** Radix primitives (shadcn/ui), Lucide icons, rounded cards (2xl), custom range sliders with filled tracks. Glassmorphic card pattern: `bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-lg`.

### Design Principles
1. **The content is the hero.** The generated SVG patterns are the star — UI chrome should frame and support, never compete. Keep controls understated so the preview dominates.
2. **Precision over decoration.** Every pixel of spacing, alignment, and contrast should feel intentional. Avoid ornamental flourishes. Prefer subtle depth (blur, transparency layers) over bold graphic elements.
3. **Dark canvas, bright output.** The dark UI creates a neutral stage that makes any color combination in the fragments pop. Never introduce UI colors that clash with user-chosen fragment palettes.
4. **Immediate feedback.** All parameter changes should feel instant and direct. The tool should feel responsive and alive — sliders that track smoothly, previews that update in real-time.
5. **Progressive disclosure.** Show essential controls upfront, reveal advanced options on demand. Avoid overwhelming the designer with every parameter at once (presets vs. custom mode pattern).
