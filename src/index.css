@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
@import "tailwindcss";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
  --color-zinc-750: #323238;
  --color-zinc-850: #202024;
}

/* Enable class-based dark mode selector in Tailwind CSS v4 */
@variant dark (&:where(.dark, .dark *));

/* Minimal, smooth scrollbar for the entire site */
html {
  scroll-behavior: smooth;
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.4);
  border-radius: 9999px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.6);
}

.dark ::-webkit-scrollbar-thumb {
  background: rgba(82, 82, 91, 0.5);
}

.dark ::-webkit-scrollbar-thumb:hover {
  background: rgba(82, 82, 91, 0.8);
}

* {
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.4) transparent;
}

.dark * {
  scrollbar-color: rgba(82, 82, 91, 0.5) transparent;
}

/* Absolute coverage to make sure the dynamically generated YouTube iframe perfectly fits the responsive aspect-video window */
#yt-player-container iframe {
  width: 100% !important;
  height: 100% !important;
  position: absolute;
  top: 0;
  left: 0;
  border: 0;
  border-radius: inherit;
}
