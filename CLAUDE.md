# Project Instructions for Claude

This project allows one to generate and animate SVG patterns based on user-configurable parameters. To use the config, clients need to copy certain files from the repo and integrate them into their codebase. The main files are:

1. `src/implementation-files/generateFragmentSvg.ts` — Core generator
2. `src/implementation-files/useFragmentReveal.ts` — (for animation: Animation hook (React))
3. `src/implementation-files/useFragmentSize.ts` — (for responsive sizing: Responsive container sizing hook (React))
4. `src/hooks/useReducedMotion.ts` — (for animation: Dependency of useFragmentReveal)

These files should therefore only contain code relevant to the generator and animation logic. They should not contain any UI-specific code or styling, which should be confined to the components in `src/app/components/`.

## Preferences

- **Do NOT start dev servers and leave them running** - If you need to verify builds, use `npm run build` instead of `npm run dev`. If you must start a dev server for testing, always stop it immediately after. Same for any long-running processes. Like the playwright browser instance - shut them down when done.

## Code Quality

- Prioritize code reuse and modularity. If you find yourself copying/pasting code, consider refactoring to extract common logic into reusable functions or components. E.g. don't create multiple <button> elements with similar styling and behavior - create a reusable Button component and use it everywhere.
- Don't assume that the current code is perfect. If it shows antipatterns then don't follow it blindly when writing your own code. Strive for creating better code than what currently exists, even if that means deviating from existing patterns, so long as the new code is clean, maintainable, DRY, and consistent with best practices.

## Project Structure

- **Skills**: Located in `.claude/skills/` - includes design-principles, create-prd, critique-plan, good-cop
- **Build tool**: Vite
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS

## Key Files

- Main component: `src/app/components/AssetGenerator.tsx` - Contains the Fragment Generator UI with grid view and control panel

## Browser Automation

Use `agent-browser` for web automation, to e.g. test things yourself. Run `agent-browser --help` for all commands.

Core workflow:

1. `agent-browser open <url>` - Navigate to page
2. `agent-browser snapshot -i` - Get interactive elements with refs (@e1, @e2)
3. `agent-browser click @e1` / `fill @e2 "text"` - Interact using refs
4. Re-snapshot after page changes

## Design Context

See docs/DESIGN.md for detailed design principles.