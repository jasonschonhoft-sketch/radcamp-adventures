import { ACTIVITY_CONFIG, ACTIVITY_KEYS } from '../config';

// All icons: 24×24 viewBox, rendered 18×18px.
// fill="none" at svg level; each element sets its own fill/stroke.
// Uses currentColor so the activity color flows through from CSS.

const ICONS = {

  // ── Hiking ────────────────────────────────────────────────────
  hiking: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
      {/* Head */}
      <circle cx="13.5" cy="3.5" r="1.8" fill="currentColor"/>
      {/* Backpack */}
      <rect x="11" y="6" width="3.5" height="4" rx="0.8" fill="currentColor" opacity="0.7"/>
      {/* Body + legs */}
      <path d="M10 7.5 Q8.5 9 9 11.5 L10 14.5 L11.5 12.5 L11 10 L13 8.5 Z" fill="currentColor"/>
      <path d="M10 14.5 L7.5 21.5 L9 22 L11 16.5 L12 19.5 L10 22.5 L11.5 23 L14 18 L12 13.5 Z" fill="currentColor"/>
      {/* Trekking pole */}
      <line x1="8" y1="8.5" x2="6.5" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="7" y1="9" x2="9" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),

  // ── Mountain Bike ─────────────────────────────────────────────
  bike: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
      {/* Rear wheel – knobby */}
      <circle cx="5.5" cy="17.5" r="4.8" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="5.5" cy="17.5" r="3.6" stroke="currentColor" strokeWidth="1.8" strokeDasharray="1.9 1.3"/>
      <circle cx="5.5" cy="17.5" r="1.8" stroke="currentColor" strokeWidth="0.7"/>
      <circle cx="5.5" cy="17.5" r="0.8" fill="currentColor"/>
      {/* Front wheel – knobby */}
      <circle cx="18.5" cy="17.5" r="4.8" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="18.5" cy="17.5" r="3.6" stroke="currentColor" strokeWidth="1.8" strokeDasharray="1.9 1.3"/>
      <circle cx="18.5" cy="17.5" r="1.8" stroke="currentColor" strokeWidth="0.7"/>
      <circle cx="18.5" cy="17.5" r="0.8" fill="currentColor"/>
      {/* Diamond frame */}
      <line x1="5.5" y1="17.5" x2="10" y2="12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="10" y1="12" x2="15" y2="12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="15" y1="12" x2="18.5" y2="17.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="10" y1="12" x2="12" y2="17.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="12" y1="17.5" x2="5.5" y2="17.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="15" y1="12" x2="12" y2="17.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      {/* Seat post + saddle */}
      <line x1="10" y1="12" x2="10.5" y2="9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="9" y1="9.5" x2="12.5" y2="9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      {/* Stem + handlebars */}
      <line x1="15" y1="12" x2="16" y2="9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="14.5" y1="9" x2="18" y2="8.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      {/* Rider silhouette */}
      <ellipse cx="13" cy="8" rx="1.7" ry="1.4" fill="currentColor"/>
      <path d="M11.5 8.5 L10 12 L13 12 L15.5 10 Z" fill="currentColor"/>
    </svg>
  ),

  // ── E-Bike ────────────────────────────────────────────────────
  ebike: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
      {/* Same bike as MTB */}
      <circle cx="5.5" cy="17.5" r="4.8" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="5.5" cy="17.5" r="3.6" stroke="currentColor" strokeWidth="1.8" strokeDasharray="1.9 1.3"/>
      <circle cx="5.5" cy="17.5" r="1.8" stroke="currentColor" strokeWidth="0.7"/>
      <circle cx="5.5" cy="17.5" r="0.8" fill="currentColor"/>
      <circle cx="18.5" cy="17.5" r="4.8" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="18.5" cy="17.5" r="3.6" stroke="currentColor" strokeWidth="1.8" strokeDasharray="1.9 1.3"/>
      <circle cx="18.5" cy="17.5" r="1.8" stroke="currentColor" strokeWidth="0.7"/>
      <circle cx="18.5" cy="17.5" r="0.8" fill="currentColor"/>
      <line x1="5.5" y1="17.5" x2="10" y2="12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="10" y1="12" x2="15" y2="12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="15" y1="12" x2="18.5" y2="17.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="10" y1="12" x2="12" y2="17.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="12" y1="17.5" x2="5.5" y2="17.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="15" y1="12" x2="12" y2="17.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="10" y1="12" x2="10.5" y2="9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="9" y1="9.5" x2="12.5" y2="9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="15" y1="12" x2="16" y2="9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="14.5" y1="9" x2="18" y2="8.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <ellipse cx="13" cy="8" rx="1.7" ry="1.4" fill="currentColor"/>
      <path d="M11.5 8.5 L10 12 L13 12 L15.5 10 Z" fill="currentColor"/>
      {/* Lightning bolt badge – upper-right corner */}
      <polygon points="22,1 20,5.5 22,5.5 19.5,10.5 24,4.5 22,4.5" fill="currentColor"/>
    </svg>
  ),

  // ── Bike Path ─────────────────────────────────────────────────
  // Overhead view of a winding single-track trail with two edges and dashed center
  bike_path: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
      {/* Left edge of trail */}
      <path
        d="M2 23 C2.5 19 2 16 4 13 C6 10 6.5 8 5 5 C4 3 5 1.5 7 1"
        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"
      />
      {/* Right edge of trail */}
      <path
        d="M6 23 C6.5 19 6 16 8 13 C10 10 10.5 8 9 5 C8 3 9 1.5 11 1"
        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"
      />
      {/* Dashed centerline */}
      <path
        d="M4 23 C4.5 19 4 16 6 13 C8 10 8.5 8 7 5 C6 3 7 1.5 9 1"
        stroke="currentColor" strokeWidth="0.9" strokeLinecap="round"
        strokeDasharray="1.8 1.6"
      />
      {/* Rocks alongside – suggests rugged natural trail */}
      <ellipse cx="0.8" cy="18" rx="1.1" ry="0.7" fill="currentColor" opacity="0.55" transform="rotate(-20 0.8 18)"/>
      <ellipse cx="11.5" cy="14" rx="1" ry="0.65" fill="currentColor" opacity="0.5" transform="rotate(15 11.5 14)"/>
      <ellipse cx="1.5" cy="9" rx="0.9" ry="0.6" fill="currentColor" opacity="0.45"/>
      <ellipse cx="12.5" cy="6" rx="1" ry="0.6" fill="currentColor" opacity="0.5" transform="rotate(-10 12.5 6)"/>
      <ellipse cx="13" cy="21" rx="0.8" ry="0.55" fill="currentColor" opacity="0.4"/>
    </svg>
  ),

  // ── Dirt Bike ─────────────────────────────────────────────────
  // Motocross profile: large rear wheel, aggressive fork angle, rider in attack position
  motorcycle: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
      {/* Rear wheel – larger, chunky knobby tread */}
      <circle cx="6" cy="17.5" r="5.2" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="6" cy="17.5" r="3.9" stroke="currentColor" strokeWidth="2.4" strokeDasharray="2.1 1.3"/>
      <circle cx="6" cy="17.5" r="2" stroke="currentColor" strokeWidth="0.8"/>
      <circle cx="6" cy="17.5" r="0.9" fill="currentColor"/>
      {/* Front wheel – smaller (motocross characteristic) */}
      <circle cx="20" cy="18.5" r="4.2" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="20" cy="18.5" r="3.1" stroke="currentColor" strokeWidth="2.1" strokeDasharray="1.8 1.1"/>
      <circle cx="20" cy="18.5" r="1.6" stroke="currentColor" strokeWidth="0.8"/>
      <circle cx="20" cy="18.5" r="0.8" fill="currentColor"/>
      {/* Frame body – filled polygon */}
      <polygon points="6,17.5 10,14.5 15.5,13 17,9.5 13,10.5 8,12.5" fill="currentColor"/>
      {/* Front fork – aggressive forward lean (two parallel legs) */}
      <line x1="16.5" y1="10" x2="20" y2="18.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="15.5" y1="12" x2="19.5" y2="18" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.7"/>
      {/* Handlebars */}
      <line x1="17" y1="9.5" x2="18" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="16.5" y1="7" x2="21" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      {/* Exhaust pipe curving up from engine */}
      <path d="M10.5 15.5 Q9 16.5 8.5 14.5 Q8 12.5 10 12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      {/* Rider – crouched attack position */}
      <ellipse cx="15.5" cy="6.5" rx="1.9" ry="1.6" fill="currentColor"/>
      <path d="M14 7.5 L11.5 10.5 L14.5 11.5 L17.5 9 Z" fill="currentColor"/>
      <line x1="17" y1="9" x2="18.5" y2="7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),

  // ── E-Dirt Bike ───────────────────────────────────────────────
  // Same motocross silhouette + lightning bolt in upper-left
  emoto: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
      {/* Rear wheel */}
      <circle cx="6" cy="17.5" r="5.2" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="6" cy="17.5" r="3.9" stroke="currentColor" strokeWidth="2.4" strokeDasharray="2.1 1.3"/>
      <circle cx="6" cy="17.5" r="2" stroke="currentColor" strokeWidth="0.8"/>
      <circle cx="6" cy="17.5" r="0.9" fill="currentColor"/>
      {/* Front wheel */}
      <circle cx="20" cy="18.5" r="4.2" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="20" cy="18.5" r="3.1" stroke="currentColor" strokeWidth="2.1" strokeDasharray="1.8 1.1"/>
      <circle cx="20" cy="18.5" r="1.6" stroke="currentColor" strokeWidth="0.8"/>
      <circle cx="20" cy="18.5" r="0.8" fill="currentColor"/>
      {/* Frame body */}
      <polygon points="6,17.5 10,14.5 15.5,13 17,9.5 13,10.5 8,12.5" fill="currentColor"/>
      {/* Front fork */}
      <line x1="16.5" y1="10" x2="20" y2="18.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="15.5" y1="12" x2="19.5" y2="18" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.7"/>
      {/* Handlebars */}
      <line x1="17" y1="9.5" x2="18" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="16.5" y1="7" x2="21" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      {/* Exhaust */}
      <path d="M10.5 15.5 Q9 16.5 8.5 14.5 Q8 12.5 10 12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      {/* Rider */}
      <ellipse cx="15.5" cy="6.5" rx="1.9" ry="1.6" fill="currentColor"/>
      <path d="M14 7.5 L11.5 10.5 L14.5 11.5 L17.5 9 Z" fill="currentColor"/>
      <line x1="17" y1="9" x2="18.5" y2="7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      {/* Lightning bolt – upper-left clear space */}
      <polygon points="3.5,1 1.5,6 3.5,6 2,10.5 6.5,4.5 4.5,4.5" fill="currentColor"/>
    </svg>
  ),

  // ── OHV / Side-by-Side ────────────────────────────────────────
  // Side profile: equal-sized large knobby wheels, low chassis, open roll cage with X-brace
  ohv: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
      {/* Rear wheel – large, same size as front (key UTV trait) */}
      <circle cx="5.5" cy="18.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="5.5" cy="18.5" r="3.4" stroke="currentColor" strokeWidth="2.3" strokeDasharray="2 1.3"/>
      <circle cx="5.5" cy="18.5" r="1.7" stroke="currentColor" strokeWidth="0.8"/>
      <circle cx="5.5" cy="18.5" r="0.9" fill="currentColor"/>
      {/* Front wheel – identical size */}
      <circle cx="18.5" cy="18.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="18.5" cy="18.5" r="3.4" stroke="currentColor" strokeWidth="2.3" strokeDasharray="2 1.3"/>
      <circle cx="18.5" cy="18.5" r="1.7" stroke="currentColor" strokeWidth="0.8"/>
      <circle cx="18.5" cy="18.5" r="0.9" fill="currentColor"/>
      {/* Chassis floor – wide and low */}
      <rect x="5" y="14.5" width="14" height="4.5" rx="0.5" fill="currentColor"/>
      {/* Skid plate armor at bottom */}
      <rect x="4.5" y="19" width="15" height="1.3" rx="0.5" fill="currentColor" opacity="0.6"/>
      {/* Roll cage – the signature UTV feature */}
      {/* Rear upright */}
      <line x1="7" y1="14.5" x2="7" y2="6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      {/* Front upright */}
      <line x1="17" y1="14.5" x2="17" y2="6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      {/* Roof bar */}
      <line x1="7" y1="6.5" x2="17" y2="6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      {/* Mid horizontal brace */}
      <line x1="7" y1="10.5" x2="17" y2="10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      {/* X-brace diagonals */}
      <line x1="7" y1="6.5" x2="17" y2="10.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
      <line x1="17" y1="6.5" x2="7" y2="10.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
    </svg>
  ),

  // ── Snowmobile ────────────────────────────────────────────────
  // Side profile: elongated hood, seat tunnel, front ski with kicked tip, rubber track
  snowmobile: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
      {/* Main body – filled elongated silhouette (nose left, tail right) */}
      <path
        d="M2.5 15.5 Q4 11.5 8.5 10.5 Q13 9.5 18 11 L21.5 13.5 L22 16 L21 17.5 L5 17.5 Q3 17.5 2.5 15.5 Z"
        fill="currentColor"
      />
      {/* Hood crease / windshield panel */}
      <line x1="6" y1="14.5" x2="9" y2="11" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.35"/>
      {/* Seat / tunnel top line */}
      <path d="M9.5 10.5 Q13.5 9.5 18 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      {/* Handlebars – riser + crossbar */}
      <line x1="10.5" y1="10.5" x2="11" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="9.5" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      {/* Rear bumper handle */}
      <line x1="21.5" y1="13.5" x2="22.5" y2="17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      {/* Headlight */}
      <ellipse cx="3" cy="14" rx="1.1" ry="0.85" fill="currentColor" opacity="0.5"/>
      {/* Front ski – elongated, pointed tip kicks upward */}
      <path d="M1.5 16.5 L6 15.8 L6 16.7 L2 17.5 Z" fill="currentColor"/>
      {/* Ski tip curves up */}
      <path d="M1.5 16.5 Q0.8 15.8 1.5 15 L3 15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      {/* Rubber track – long rectangle at bottom */}
      <rect x="5" y="17.5" width="16.5" height="2.2" rx="1.1" fill="currentColor"/>
      {/* Track lugs – subtle vertical marks */}
      <line x1="8" y1="17.5" x2="8" y2="19.7" stroke="currentColor" strokeWidth="0.8" opacity="0.3"/>
      <line x1="11" y1="17.5" x2="11" y2="19.7" stroke="currentColor" strokeWidth="0.8" opacity="0.3"/>
      <line x1="14" y1="17.5" x2="14" y2="19.7" stroke="currentColor" strokeWidth="0.8" opacity="0.3"/>
      <line x1="17" y1="17.5" x2="17" y2="19.7" stroke="currentColor" strokeWidth="0.8" opacity="0.3"/>
      <line x1="20" y1="17.5" x2="20" y2="19.7" stroke="currentColor" strokeWidth="0.8" opacity="0.3"/>
    </svg>
  ),
};

const SECTION_LABELS = {
  hiking:     null,
  bike:       'Cycling',
  ebike:      null,
  bike_path:  null,
  motorcycle: 'Motorized',
  emoto:      null,
  ohv:        null,
  snowmobile: 'Winter',
};

export default function ActivityFilter({ activeFilters, onToggle }) {
  const allOn = ACTIVITY_KEYS.every(k => activeFilters[k]);

  function toggleAll() {
    const targetState = !allOn;
    ACTIVITY_KEYS.forEach(k => {
      if (activeFilters[k] !== targetState) onToggle(k);
    });
  }

  return (
    <div className="activity-filter">
      <div className="filter-header">
        <span className="filter-title">Trail Types</span>
        <button className="filter-all-btn" onClick={toggleAll}>
          {allOn ? 'Hide All' : 'Show All'}
        </button>
      </div>

      <div className="filter-list">
        {ACTIVITY_KEYS.map(key => {
          const config = ACTIVITY_CONFIG[key];
          const active = activeFilters[key];
          const sectionLabel = SECTION_LABELS[key];

          return (
            <div key={key}>
              {sectionLabel && (
                <div className="filter-section-label">{sectionLabel}</div>
              )}
              <button
                className={`filter-item ${active ? 'active' : 'inactive'}`}
                style={{ '--activity-color': config.color }}
                onClick={() => onToggle(key)}
                aria-pressed={active}
                title={config.note || config.label}
              >
                <span className="filter-dot" />
                <span className="filter-icon">{ICONS[key]}</span>
                <span className="filter-label">
                  {config.label}
                  {config.note && <span className="filter-note"> *</span>}
                </span>
                <span className="filter-toggle">{active ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          );
        })}
      </div>

      <div className="filter-footer">
        <span className="filter-footer-note">* Based on bike/moto access data</span>
      </div>
    </div>
  );
}
