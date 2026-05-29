import { useState, useEffect, useMemo } from 'react';
import { Map as GoogleMap, Marker } from '@vis.gl/react-google-maps';
import { formatRideDate, signedUrlsFor, deleteRide, COLORADO_CENTER } from '../lib/rides';

// Read-only mini map showing the ride's pins.
function PinsMap({ pins }) {
  const center = pins[0] ? { lat: pins[0].lat, lng: pins[0].lng } : COLORADO_CENTER;
  return (
    <div className="ride-detail-map">
      <GoogleMap
        defaultCenter={center}
        defaultZoom={pins[0] ? 12 : 7}
        gestureHandling="greedy"
        mapTypeId="hybrid"
        disableDefaultUI={true}
        zoomControl={true}
      >
        {pins.map((p, i) => (
          <Marker key={i} position={{ lat: p.lat, lng: p.lng }} label={String(i + 1)} title={p.label || `Pin ${i + 1}`} />
        ))}
      </GoogleMap>
    </div>
  );
}

export default function RideDetail({ ride, onClose, onEdit, onDeleted }) {
  const [urls, setUrls] = useState({}); // storage_path -> signed url
  const [lightbox, setLightbox] = useState(null); // signed url of expanded photo
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const photos = ride?.photos || [];
  const pins = useMemo(() => (Array.isArray(ride?.pins) ? ride.pins : []), [ride]);

  useEffect(() => {
    let alive = true;
    if (photos.length) {
      signedUrlsFor(photos.map(p => p.storage_path)).then(map => { if (alive) setUrls(map); });
    }
    return () => { alive = false; };
  }, [ride?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (lightbox) setLightbox(null);
      else if (!deleting) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lightbox, deleting, onClose]);

  if (!ride) return null;

  async function handleDelete() {
    if (!window.confirm('Delete this ride and all its photos? This cannot be undone.')) return;
    setError('');
    setDeleting(true);
    try {
      await deleteRide(ride);
      setDeleting(false);
      if (onDeleted) onDeleted();
    } catch (err) {
      console.error('[RideDetail] delete failed:', err);
      setError(err?.message || 'Could not delete the ride.');
      setDeleting(false);
    }
  }

  const stats = [
    ride.distance_miles != null && { label: 'Distance', value: `${ride.distance_miles} mi` },
    ride.duration_minutes != null && { label: 'Duration', value: `${ride.duration_minutes} min` },
    ride.elevation_gain_ft != null && { label: 'Elevation', value: `${ride.elevation_gain_ft} ft` },
  ].filter(Boolean);

  return (
    <div className="ride-detail">
      <div className="ride-detail-head">
        <button className="ride-back" onClick={onClose} aria-label="Back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
      </div>

      <div className="ride-detail-body">
        <h2 className="ride-detail-title">{ride.title}</h2>
        <div className="ride-detail-meta">
          <span>{formatRideDate(ride.ride_date)}</span>
          {ride.area_name && <span className="ride-detail-area">· {ride.area_name}</span>}
        </div>

        {stats.length > 0 && (
          <div className="ride-detail-stats">
            {stats.map(s => (
              <div className="ride-stat" key={s.label}>
                <div className="ride-stat-value">{s.value}</div>
                <div className="ride-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {ride.notes && <p className="ride-detail-notes">{ride.notes}</p>}

        {photos.length > 0 && (
          <div className="ride-photo-grid">
            {photos.map((p) => {
              const url = urls[p.storage_path];
              return (
                <button
                  key={p.id}
                  className="ride-photo-cell"
                  onClick={() => url && setLightbox(url)}
                  aria-label="Expand photo"
                >
                  {url ? <img src={url} alt={p.caption || 'Ride photo'} loading="lazy" /> : <span className="fc-spinner" />}
                </button>
              );
            })}
          </div>
        )}

        {pins.length > 0 && <PinsMap pins={pins} />}

        {error && <div className="auth-error" style={{ marginTop: 12 }}>{error}</div>}

        <div className="ride-detail-actions">
          <button className="ride-btn-cancel" onClick={() => onEdit?.(ride)} disabled={deleting}>Edit</button>
          <button className="ride-btn-delete" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete Ride'}
          </button>
        </div>
      </div>

      {lightbox && (
        <div className="ride-lightbox" onClick={() => setLightbox(null)}>
          <button className="ride-lightbox-close" aria-label="Close" onClick={() => setLightbox(null)}>×</button>
          <img src={lightbox} alt="Expanded ride photo" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
