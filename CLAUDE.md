# Project Instructions for Claude

## Preferences

- **Do NOT start dev servers and leave them running** - If you need to verify builds, use `npm run build` instead of `npm run dev`. If you must start a dev server for testing, always stop it immediately after.

## Project Structure

- **Skills**: Located in `.claude/skills/` - includes design-principles, create-prd, critique-plan, good-cop
- **Build tool**: Vite
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS

## Key Files

- Main component: `src/app/components/AssetGenerator.tsx` - Contains the Fragment Generator UI with grid view and control panel
