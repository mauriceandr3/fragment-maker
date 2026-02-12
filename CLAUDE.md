# Project Instructions for Claude

This project allows one to generate and animate SVG patterns based on user-configurable parameters. To use the config, clients need to copy certain files from the repo and integrate them into their codebase. The main files are:

1. `src/lib/generateFragmentSvg.ts` — Core generator 
2. `src/hooks/useFragmentReveal.ts` — (for animation: Animation hook (React))
3. `src/hooks/useReducedMotion.ts` — (for animation: Dependency of the above)

These files should therefore only contain code relevant to the generator and animation logic. They should not contain any UI-specific code or styling, which should be confined to the components in `src/app/components/`.

## Preferences

- **Do NOT start dev servers and leave them running** - If you need to verify builds, use `npm run build` instead of `npm run dev`. If you must start a dev server for testing, always stop it immediately after. Same for any long-running processes. Like the playwright browser instance - shut them down when done.

## Project Structure

- **Skills**: Located in `.claude/skills/` - includes design-principles, create-prd, critique-plan, good-cop
- **Build tool**: Vite
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS

## Key Files

- Main component: `src/app/components/AssetGenerator.tsx` - Contains the Fragment Generator UI with grid view and control panel

## Testing
- You have access to the Playwright MCP tool for end-to-end testing. Use it to "manually" test the UI yourself, to validate/verify fixes.
