import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Map as GoogleMap, Marker, InfoWindow } from '@vis.gl/react-google-maps';
import { fetchRides, signedUrlsFor, formatRideDate, RIDE_PIN_COLORS, COLORADO_CENTER } from '../lib/rides';
import RideDetail from './RideDetail';

function notesPreview(notes) {
  if (!notes) return '';
  const t = notes.trim();
  return t.length > 80 ? t.slice(0, 80).trimEnd() + '…' : t;
}

// Combined map of every ride's pins, color-coded per ride.
function RidesMap({ rides, onViewRide }) {
  const [selected, setSelected] = useState(null); // { rideIdx, pinIdx }
  const hasGoogle = typeof window !== 'undefined' && window.google?.maps;

  // Center on the first ride's first pin if we have one.
  let center = COLORADO_CENTER;
  for (const r of rides) {
    if (Array.isArray(r.pins) && r.pins[0]) { center = { lat: r.pins[0].lat, lng: r.pins[0].lng }; break; }
  }

  const sel = selected ? rides[selected.rideIdx]?.pins?.[selected.pinIdx] : null;

  return (
    <div className="rides-map">
      <GoogleMap
        defaultCenter={center}
        defaultZoom={center === COLORADO_CENTER ? 7 : 10}
        gestureHandling="greedy"
        mapTypeId="hybrid"
        disableDefaultUI={true}
        zoomControl={true}
      >
        {rides.flatMap((ride, rideIdx) => {
          const color = RIDE_PIN_COLORS[rideIdx % RIDE_PIN_COLORS.length];
          const icon = hasGoogle ? {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8, fillColor: color, fillOpacity: 0.95, strokeColor: '#fff', strokeWeight: 2,
          } : undefined;
          return (Array.isArray(ride.pins) ? ride.pins : []).map((p, pinIdx) => (
            <Marker
              key={`${ride.id}-${pinIdx}`}
              position={{ lat: p.lat, lng: p.lng }}
              icon={icon}
              title={ride.title}
              onClick={() => setSelected({ rideIdx, pinIdx })}
            />
          ));
        })}

        {sel && (
          <InfoWindow position={{ lat: sel.lat, lng: sel.lng }} onCloseClick={() => setSelected(null)}>
            <div className="rides-iw">
              <div className="rides-iw-title">{rides[selected.rideIdx].title}</div>
              <div className="rides-iw-date">{formatRideDate(rides[selected.rideIdx].ride_date)}</div>
              {sel.label && <div className="rides-iw-label">{sel.label}</div>}
              {sel.source === 'photo_exif' && <div className="rides-iw-origin">📷 Pin from photo</div>}
              <button className="rides-iw-btn" onClick={() => onViewRide(rides[selected.rideIdx])}>View Ride</button>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}

export default function MyRidesPanel({ open, onClose, onEdit, refreshSignal }) {
  const [view, setView] = useState('list');
  const [rides, setRides] = useState([]);
  const [thumbs, setThumbs] = useState({}); // storage_path -> signed url
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRideId, setSelectedRideId] = useState(null);

  // Derive the selected ride from the latest list so it stays fresh after edits.
  const selectedRide = selectedRideId ? rides.find(r => r.id === selectedRideId) : null;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchRides();
      setRides(data);
      // Fetch signed URLs for each ride's first photo (list thumbnails).
      const firsts = data.map(r => r.photos?.[0]?.storage_path).filter(Boolean);
      if (firsts.length) setThumbs(await signedUrlsFor(firsts));
      else setThumbs({});
    } catch (err) {
      console.error('[MyRides] load failed:', err);
      setError(err?.message || 'Could not load your rides.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (open) load(); }, [open, refreshSignal, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape' && !selectedRide) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, selectedRide]);

  if (!open) return null;

  return createPortal(
    <div className="rides-panel">
      <div className="rides-panel-header">
        <button className="auth-close rides-panel-close" onClick={onClose} aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" /><line x1="6" y1="18" x2="18" y2="6" />
          </svg>
        </button>
        <h2 className="rides-panel-title">My Rides</h2>
        {!selectedRide && (
          <div className="rides-toggle">
            <button className={`rides-toggle-btn${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')}>List</button>
            <button className={`rides-toggle-btn${view === 'map' ? ' active' : ''}`} onClick={() => setView('map')}>Map</button>
          </div>
        )}
      </div>

      <div className="rides-panel-content">
        {selectedRide ? (
          <RideDetail
            ride={selectedRide}
            onClose={() => setSelectedRideId(null)}
            onEdit={(r) => onEdit?.(r)}
            onDeleted={() => { setSelectedRideId(null); load(); }}
          />
        ) : loading ? (
          <div className="rides-empty"><span className="fc-spinner" /> Loading your rides…</div>
        ) : error ? (
          <div className="rides-empty rides-error">{error}</div>
        ) : rides.length === 0 ? (
          <div className="rides-empty">No rides yet. Tap “Log a Ride” to add your first one!</div>
        ) : view === 'list' ? (
          <div className="rides-list">
            {rides.map(ride => {
              const thumb = ride.photos?.[0] && thumbs[ride.photos[0].storage_path];
              return (
                <button key={ride.id} className="ride-card" onClick={() => setSelectedRideId(ride.id)}>
                  {thumb
                    ? <img className="ride-card-thumb" src={thumb} alt="" loading="lazy" />
                    : <div className="ride-card-thumb ride-card-thumb-empty">🚵</div>}
                  <div className="ride-card-body">
                    <div className="ride-card-title">{ride.title}</div>
                    <div className="ride-card-meta">
                      {formatRideDate(ride.ride_date)}{ride.area_name ? ` · ${ride.area_name}` : ''}
                    </div>
                    {ride.notes && <div className="ride-card-notes">{notesPreview(ride.notes)}</div>}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <RidesMap rides={rides} onViewRide={(r) => setSelectedRideId(r.id)} />
        )}
      </div>
    </div>,
    document.body
  );
}
