function svg(paths, className = "icon") {
  return `<svg class="${className}" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

export const icons = Object.freeze({
  back: svg('<path d="m15 18-6-6 6-6"/>'),
  check: svg('<path d="m5 12 4 4L19 6"/>'),
  chevron: svg('<path d="m9 18 6-6-6-6"/>'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  football: svg('<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M12 5v14M3 9h3v6H3m18-6h-3v6h3"/><circle cx="12" cy="12" r="2.5"/>'),
  gear: svg('<path d="M4 7h10m4 0h2M4 17h2m4 0h10M14 4v6M6 14v6"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-9h.01"/>'),
  close: svg('<path d="m6 6 12 12M18 6 6 18"/>'),
  globe: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.4 2.5 3.6 5.5 3.6 9S14.4 18.5 12 21c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3Z"/>'),
  play: '<svg class="icon play-icon" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.8v12.4c0 1.1 1.2 1.8 2.2 1.2l9.1-6.2a1.45 1.45 0 0 0 0-2.4l-9.1-6.2A1.4 1.4 0 0 0 8 5.8Z"/></svg>',
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>'),
});
