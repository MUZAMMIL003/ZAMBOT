# Superseded by the 2026-09-23 redesign

Replaced files, kept out of the build (tsconfig includes only src/, ESLint ignores this folder).
Restore one by moving it back to the same path under src/.

- routes/Home.tsx, routes/NewChat.tsx -> src/routes/Start.tsx
- components/chat/NavigationRail.tsx, HistoryRail.tsx, TabBar.tsx -> src/components/chat/Sidebar.tsx
- components/ui/Orb.tsx (the glowing orb) -> src/components/ui/PixelMark.tsx

# Superseded 2026-09-27: the dark landing

The black, e2b-inspired landing (condensed Archivo headlines, IBM Plex Mono labels,
yellow square buttons, dark pixel-noise field) was replaced by a landing in the app's
own pastel-glass design. Its files are in landing-dark/.

- landing-dark/Landing.tsx -> src/routes/Landing.tsx
- landing-dark/components/HeroDemo, FeatureCells, ReadingTrack -> rewritten in src/components/landing/
- landing-dark/components/PixelField.tsx -> src/components/landing/PageField.tsx
