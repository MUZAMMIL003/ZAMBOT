# Superseded by the 2026-09-23 redesign

Replaced files, kept out of the build (tsconfig includes only src/, ESLint ignores this folder).
Restore one by moving it back to the same path under src/.

- routes/Home.tsx, routes/NewChat.tsx -> src/routes/Start.tsx
- components/chat/NavigationRail.tsx, HistoryRail.tsx, TabBar.tsx -> src/components/chat/Sidebar.tsx
