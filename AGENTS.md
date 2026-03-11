# AGENTS.md

## Project
Raycast extension for searching browser history across Chrome, Firefox, Safari, Edge, Brave, Vivaldi, Arc, Opera, Iridium, Orion, and Sidekick.

## Stack
TypeScript, React (Raycast API), SQLite

## Structure
```
src/
├── search-history.tsx      # Entry point
├── hooks/useHistorySearch  # Search logic
├── util/index.ts           # DB queries
├── constants.ts            # Browser configs
├── interfaces/index.ts     # Types, SupportedBrowsers enum
├── actions/index.ts        # openNewTab
└── components/             # UI components
```

## Commands
```bash
npm run dev     # Dev mode
npm run build   # Build
npm run lint    # Lint
```

## Adding a Browser
1. Add to `SupportedBrowsers` enum in `src/interfaces/index.ts`
2. Add config in `src/constants.ts`
3. Add logo to `assets/`

## Conventions
- Functional components with hooks
- Handle SQLite errors gracefully
- Use existing error components for browser issues
