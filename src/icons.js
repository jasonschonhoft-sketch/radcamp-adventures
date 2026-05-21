// Generates inline SVG HTML strings with explicit color values.
// Used in Google Maps InfoWindow content (no JSX / currentColor available there).
// The JSX sidebar icons in ActivityFilter.jsx are defined separately and kept in sync visually.

const RENDERS = {
  hiking: c => `
    <circle cx="13.5" cy="3.5" r="1.8" fill="${c}"/>
    <rect x="11" y="6" width="3.5" height="4" rx="0.8" fill="${c}" opacity="0.7"/>
    <path d="M10 7.5Q8.5 9 9 11.5L10 14.5L11.5 12.5L11 10L13 8.5Z" fill="${c}"/>
    <path d="M10 14.5L7.5 21.5L9 22L11 16.5L12 19.5L10 22.5L11.5 23L14 18L12 13.5Z" fill="${c}"/>
    <line x1="8" y1="8.5" x2="6.5" y2="22" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="7" y1="9" x2="9" y2="9" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/>
  `,

  bike: c => `
    <circle cx="5.5" cy="17.5" r="4.8" stroke="${c}" stroke-width="1.4"/>
    <circle cx="5.5" cy="17.5" r="3.6" stroke="${c}" stroke-width="1.8" stroke-dasharray="1.9 1.3"/>
    <circle cx="5.5" cy="17.5" r="1.8" stroke="${c}" stroke-width="0.7"/>
    <circle cx="5.5" cy="17.5" r="0.8" fill="${c}"/>
    <circle cx="18.5" cy="17.5" r="4.8" stroke="${c}" stroke-width="1.4"/>
    <circle cx="18.5" cy="17.5" r="3.6" stroke="${c}" stroke-width="1.8" stroke-dasharray="1.9 1.3"/>
    <circle cx="18.5" cy="17.5" r="1.8" stroke="${c}" stroke-width="0.7"/>
    <circle cx="18.5" cy="17.5" r="0.8" fill="${c}"/>
    <line x1="5.5" y1="17.5" x2="10" y2="12" stroke="${c}" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="10" y1="12" x2="15" y2="12" stroke="${c}" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="15" y1="12" x2="18.5" y2="17.5" stroke="${c}" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="10" y1="12" x2="12" y2="17.5" stroke="${c}" stroke-width="1.2" stroke-linecap="round"/>
    <line x1="12" y1="17.5" x2="5.5" y2="17.5" stroke="${c}" stroke-width="1.2" stroke-linecap="round"/>
    <line x1="15" y1="12" x2="12" y2="17.5" stroke="${c}" stroke-width="1.2" stroke-linecap="round"/>
    <line x1="10" y1="12" x2="10.5" y2="9.5" stroke="${c}" stroke-width="1.3" stroke-linecap="round"/>
    <line x1="9" y1="9.5" x2="12.5" y2="9.5" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="15" y1="12" x2="16" y2="9.5" stroke="${c}" stroke-width="1.3" stroke-linecap="round"/>
    <line x1="14.5" y1="9" x2="18" y2="8.5" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/>
    <ellipse cx="13" cy="8" rx="1.7" ry="1.4" fill="${c}"/>
    <path d="M11.5 8.5L10 12L13 12L15.5 10Z" fill="${c}"/>
  `,

  bike_path: c => `
    <path d="M2 23C2.5 19 2 16 4 13C6 10 6.5 8 5 5C4 3 5 1.5 7 1" stroke="${c}" stroke-width="1.3" stroke-linecap="round"/>
    <path d="M6 23C6.5 19 6 16 8 13C10 10 10.5 8 9 5C8 3 9 1.5 11 1" stroke="${c}" stroke-width="1.3" stroke-linecap="round"/>
    <path d="M4 23C4.5 19 4 16 6 13C8 10 8.5 8 7 5C6 3 7 1.5 9 1" stroke="${c}" stroke-width="0.9" stroke-linecap="round" stroke-dasharray="1.8 1.6"/>
    <ellipse cx="0.8" cy="18" rx="1.1" ry="0.7" fill="${c}" opacity="0.55" transform="rotate(-20 0.8 18)"/>
    <ellipse cx="11.5" cy="14" rx="1" ry="0.65" fill="${c}" opacity="0.5" transform="rotate(15 11.5 14)"/>
    <ellipse cx="1.5" cy="9" rx="0.9" ry="0.6" fill="${c}" opacity="0.45"/>
    <ellipse cx="12.5" cy="6" rx="1" ry="0.6" fill="${c}" opacity="0.5" transform="rotate(-10 12.5 6)"/>
  `,

  motorcycle: c => `
    <circle cx="6" cy="17.5" r="5.2" stroke="${c}" stroke-width="1.5"/>
    <circle cx="6" cy="17.5" r="3.9" stroke="${c}" stroke-width="2.4" stroke-dasharray="2.1 1.3"/>
    <circle cx="6" cy="17.5" r="2" stroke="${c}" stroke-width="0.8"/>
    <circle cx="6" cy="17.5" r="0.9" fill="${c}"/>
    <circle cx="20" cy="18.5" r="4.2" stroke="${c}" stroke-width="1.5"/>
    <circle cx="20" cy="18.5" r="3.1" stroke="${c}" stroke-width="2.1" stroke-dasharray="1.8 1.1"/>
    <circle cx="20" cy="18.5" r="1.6" stroke="${c}" stroke-width="0.8"/>
    <circle cx="20" cy="18.5" r="0.8" fill="${c}"/>
    <polygon points="6,17.5 10,14.5 15.5,13 17,9.5 13,10.5 8,12.5" fill="${c}"/>
    <line x1="16.5" y1="10" x2="20" y2="18.5" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="15.5" y1="12" x2="19.5" y2="18" stroke="${c}" stroke-width="1.1" stroke-linecap="round" opacity="0.7"/>
    <line x1="17" y1="9.5" x2="18" y2="7" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="16.5" y1="7" x2="21" y2="7" stroke="${c}" stroke-width="2" stroke-linecap="round"/>
    <path d="M10.5 15.5Q9 16.5 8.5 14.5Q8 12.5 10 12.5" stroke="${c}" stroke-width="1.2" stroke-linecap="round"/>
    <ellipse cx="15.5" cy="6.5" rx="1.9" ry="1.6" fill="${c}"/>
    <path d="M14 7.5L11.5 10.5L14.5 11.5L17.5 9Z" fill="${c}"/>
    <line x1="17" y1="9" x2="18.5" y2="7" stroke="${c}" stroke-width="1.3" stroke-linecap="round"/>
  `,

  emoto: c => `
    <circle cx="6" cy="17.5" r="5.2" stroke="${c}" stroke-width="1.5"/>
    <circle cx="6" cy="17.5" r="3.9" stroke="${c}" stroke-width="2.4" stroke-dasharray="2.1 1.3"/>
    <circle cx="6" cy="17.5" r="2" stroke="${c}" stroke-width="0.8"/>
    <circle cx="6" cy="17.5" r="0.9" fill="${c}"/>
    <circle cx="20" cy="18.5" r="4.2" stroke="${c}" stroke-width="1.5"/>
    <circle cx="20" cy="18.5" r="3.1" stroke="${c}" stroke-width="2.1" stroke-dasharray="1.8 1.1"/>
    <circle cx="20" cy="18.5" r="1.6" stroke="${c}" stroke-width="0.8"/>
    <circle cx="20" cy="18.5" r="0.8" fill="${c}"/>
    <polygon points="6,17.5 10,14.5 15.5,13 17,9.5 13,10.5 8,12.5" fill="${c}"/>
    <line x1="16.5" y1="10" x2="20" y2="18.5" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="15.5" y1="12" x2="19.5" y2="18" stroke="${c}" stroke-width="1.1" stroke-linecap="round" opacity="0.7"/>
    <line x1="17" y1="9.5" x2="18" y2="7" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="16.5" y1="7" x2="21" y2="7" stroke="${c}" stroke-width="2" stroke-linecap="round"/>
    <path d="M10.5 15.5Q9 16.5 8.5 14.5Q8 12.5 10 12.5" stroke="${c}" stroke-width="1.2" stroke-linecap="round"/>
    <ellipse cx="15.5" cy="6.5" rx="1.9" ry="1.6" fill="${c}"/>
    <path d="M14 7.5L11.5 10.5L14.5 11.5L17.5 9Z" fill="${c}"/>
    <line x1="17" y1="9" x2="18.5" y2="7" stroke="${c}" stroke-width="1.3" stroke-linecap="round"/>
    <polygon points="3.5,1 1.5,6 3.5,6 2,10.5 6.5,4.5 4.5,4.5" fill="${c}"/>
  `,

  ohv: c => `
    <circle cx="5.5" cy="18.5" r="4.5" stroke="${c}" stroke-width="1.5"/>
    <circle cx="5.5" cy="18.5" r="3.4" stroke="${c}" stroke-width="2.3" stroke-dasharray="2 1.3"/>
    <circle cx="5.5" cy="18.5" r="1.7" stroke="${c}" stroke-width="0.8"/>
    <circle cx="5.5" cy="18.5" r="0.9" fill="${c}"/>
    <circle cx="18.5" cy="18.5" r="4.5" stroke="${c}" stroke-width="1.5"/>
    <circle cx="18.5" cy="18.5" r="3.4" stroke="${c}" stroke-width="2.3" stroke-dasharray="2 1.3"/>
    <circle cx="18.5" cy="18.5" r="1.7" stroke="${c}" stroke-width="0.8"/>
    <circle cx="18.5" cy="18.5" r="0.9" fill="${c}"/>
    <rect x="5" y="14.5" width="14" height="4.5" rx="0.5" fill="${c}"/>
    <rect x="4.5" y="19" width="15" height="1.3" rx="0.5" fill="${c}" opacity="0.6"/>
    <line x1="7" y1="14.5" x2="7" y2="6.5" stroke="${c}" stroke-width="2" stroke-linecap="round"/>
    <line x1="17" y1="14.5" x2="17" y2="6.5" stroke="${c}" stroke-width="2" stroke-linecap="round"/>
    <line x1="7" y1="6.5" x2="17" y2="6.5" stroke="${c}" stroke-width="2" stroke-linecap="round"/>
    <line x1="7" y1="10.5" x2="17" y2="10.5" stroke="${c}" stroke-width="1.3" stroke-linecap="round"/>
    <line x1="7" y1="6.5" x2="17" y2="10.5" stroke="${c}" stroke-width="1.1" stroke-linecap="round"/>
    <line x1="17" y1="6.5" x2="7" y2="10.5" stroke="${c}" stroke-width="1.1" stroke-linecap="round"/>
  `,

  snowmobile: c => `
    <path d="M2.5 15.5Q4 11.5 8.5 10.5Q13 9.5 18 11L21.5 13.5L22 16L21 17.5L5 17.5Q3 17.5 2.5 15.5Z" fill="${c}"/>
    <line x1="6" y1="14.5" x2="9" y2="11" stroke="rgba(0,0,0,0.2)" stroke-width="1.1" stroke-linecap="round"/>
    <path d="M9.5 10.5Q13.5 9.5 18 11" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/>
    <line x1="10.5" y1="10.5" x2="11" y2="8" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="9.5" y1="8" x2="13" y2="8" stroke="${c}" stroke-width="2" stroke-linecap="round"/>
    <line x1="21.5" y1="13.5" x2="22.5" y2="17" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/>
    <ellipse cx="3" cy="14" rx="1.1" ry="0.85" fill="${c}" opacity="0.5"/>
    <path d="M1.5 16.5L6 15.8L6 16.7L2 17.5Z" fill="${c}"/>
    <path d="M1.5 16.5Q0.8 15.8 1.5 15L3 15" stroke="${c}" stroke-width="1.3" stroke-linecap="round"/>
    <rect x="5" y="17.5" width="16.5" height="2.2" rx="1.1" fill="${c}"/>
    <line x1="8" y1="17.5" x2="8" y2="19.7" stroke="${c}" stroke-width="0.8" opacity="0.3"/>
    <line x1="11" y1="17.5" x2="11" y2="19.7" stroke="${c}" stroke-width="0.8" opacity="0.3"/>
    <line x1="14" y1="17.5" x2="14" y2="19.7" stroke="${c}" stroke-width="0.8" opacity="0.3"/>
    <line x1="17" y1="17.5" x2="17" y2="19.7" stroke="${c}" stroke-width="0.8" opacity="0.3"/>
    <line x1="20" y1="17.5" x2="20" y2="19.7" stroke="${c}" stroke-width="0.8" opacity="0.3"/>
  `,
};

export function renderIconHtml(key, color, width = 16, height = 14) {
  const inner = RENDERS[key];
  if (!inner) return '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${width}" height="${height}" fill="none" style="flex-shrink:0;display:inline-block;vertical-align:middle">${inner(color)}</svg>`;
}
