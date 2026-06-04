import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Map as GoogleMap, Marker, useMap } from '@vis.gl/react-google-maps';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  resizeImage, photoPath, todayISO, formatRideDate, signedUrlsFor, extractPhotoExif,
  parseGpxToTrack, trackToLines, COLORADO_CENTER,
} from '../lib/rides';

// Draws an imported GPX track as a cyan polyline and fits the map to it.
function TrackOverlay({ track }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const lines = trackToLines(track);
    if (!lines.length) return;
    const bounds = new google.maps.LatLngBounds();
    const polylines = lines.map(coords => {
      const path = coords.map(([lng, lat]) => ({ lat, lng }));
      path.forEach(pt => bounds.extend(pt));
      return new google.maps.Polyline({ path, strokeColor: '#06b6d4', strokeOpacity: 0.95, strokeWeight: 4, map });
    });
    if (!bounds.isEmpty()) map.fitBounds(bounds);
    return () => polylines.forEach(p => p.setMap(null));
  }, [map, track]);
  return null;
}

// Interactive pin-drop map. Tap to drop a pin; pins come from / go to parent.
// When a GPX track is loaded it's drawn on top and the map fits to it.
function PinMap({ pins, onAddPin, center, track }) {
  return (
    <div className="ride-pinmap">
      <GoogleMap
        defaultCenter={center || COLORADO_CENTER}
        defaultZoom={center === COLORADO_CENTER ? 7 : 11}
        gestureHandling="greedy"
        mapTypeId="hybrid"
        disableDefaultUI={true}
        zoomControl={true}
        onClick={(e) => {
          const ll = e.detail?.latLng;
          if (ll) onAddPin({ lat: ll.lat, lng: ll.lng, label: '' });
        }}
      >
        {pins.map((p, i) => (
          <Marker key={i} position={{ lat: p.lat, lng: p.lng }} label={String(i + 1)} />
        ))}
        {track && <TrackOverlay track={track} />}
      </GoogleMap>
    </div>
  );
}

export default function LogRideModal({ open, onClose, onSaved, mapRef, editRide }) {
  const { user } = useAuth();
  const isEdit = !!editRide;

  const [title, setTitle] = useState('');
  const [rideDate, setRideDate] = useState(todayISO());
  const [areaName, setAreaName] = useState('');
  const [notes, setNotes] = useState('');
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [elevation, setElevation] = useState('');
  const [pins, setPins] = useState([]);
  const [track, setTrack] = useState(null);      // GeoJSON geometry from an imported GPX
  const [trackInfo, setTrackInfo] = useState(''); // status line under the GPX picker
  // photos: { kind:'new', file, url } | { kind:'existing', photo, url }
  const [photos, setPhotos] = useState([]);
  const [removedPaths, setRemovedPaths] = useState([]); // existing storage_paths to delete on save
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState('');
  const [extracting, setExtracting] = useState(false); // EXIF GPS parse in progress
  const [gpsStats, setGpsStats] = useState({ detected: 0, total: 0 }); // auto-pin tally

  // Center the pin map on the editing ride's first pin, else the user's current
  // map view, else Colorado.
  const mapCenter = useMemo(() => {
    if (editRide?.pins?.[0]) return { lat: editRide.pins[0].lat, lng: editRide.pins[0].lng };
    const c = mapRef?.current?.getCenter?.();
    if (c) return { lat: c.lat(), lng: c.lng() };
    return COLORADO_CENTER;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Reset / prefill the form each time the modal opens.
  useEffect(() => {
    if (!open) return;
    setError('');
    setSaving(false);
    setProgress('');
    setRemovedPaths([]);
    setExtracting(false);
    setGpsStats({ detected: 0, total: 0 });
    if (isEdit) {
      setTitle(editRide.title || '');
      setRideDate(editRide.ride_date || todayISO());
      setAreaName(editRide.area_name || '');
      setNotes(editRide.notes || '');
      setDistance(editRide.distance_miles ?? '');
      setDuration(editRide.duration_minutes ?? '');
      setElevation(editRide.elevation_gain_ft ?? '');
      setPins(Array.isArray(editRide.pins) ? editRide.pins.map(p => ({ ...p, label: p.label || '' })) : []);
      setTrack(editRide.track_geojson || null);
      setTrackInfo(editRide.track_geojson ? 'Recorded track attached.' : '');
      // Load existing photos as signed-URL thumbnails.
      const existing = editRide.photos || [];
      setPhotos(existing.map(photo => ({ kind: 'existing', photo, url: '' })));
      if (existing.length) {
        signedUrlsFor(existing.map(p => p.storage_path)).then(map => {
          setPhotos(existing.map(photo => ({ kind: 'existing', photo, url: map[photo.storage_path] || '' })));
        });
      }
    } else {
      const today = todayISO();
      setTitle(`Ride on ${formatRideDate(today)}`);
      setRideDate(today);
      setAreaName('');
      setNotes('');
      setDistance('');
      setDuration('');
      setElevation('');
      setPins([]);
      setTrack(null);
      setTrackInfo('');
      setPhotos([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on Escape (unless mid-save).
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape' && !saving) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, saving]);

  // Revoke object URLs created for newly-selected files on unmount.
  useEffect(() => () => {
    photos.forEach(p => { if (p.kind === 'new') URL.revokeObjectURL(p.url); });
  }, [photos]);

  if (!open) return null;

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = ''; // allow re-selecting the same file
    if (!files.length) return;

    const next = files.map(file => ({ kind: 'new', file, url: URL.createObjectURL(file) }));
    setPhotos(prev => [...prev, ...next]);

    // Auto-extract GPS pins from photo EXIF — fully client-side, no network.
    setExtracting(true);
    try {
      const extracted = await Promise.all(
        files.map(async (file) => ({ file, exif: await extractPhotoExif(file) }))
      );
      const withGps = extracted.filter(x => x.exif.lat != null && x.exif.lng != null);
      // Order chronologically by capture time so pins follow the ride; photos
      // without a timestamp fall to the end while keeping their relative order.
      withGps.sort((a, b) => (a.exif.timestamp ?? Infinity) - (b.exif.timestamp ?? Infinity));

      if (withGps.length) {
        setPins(prev => {
          const startNum = prev.filter(p => p.source === 'photo_exif').length;
          const autoPins = withGps.map((x, i) => ({
            lat: x.exif.lat,
            lng: x.exif.lng,
            label: `Photo ${startNum + i + 1}`,
            source: 'photo_exif',
            photo_filename: x.file.name,
          }));
          return [...prev, ...autoPins]; // append — never drop manual pins
        });
      }
      setGpsStats(prev => ({
        detected: prev.detected + withGps.length,
        total: prev.total + files.length,
      }));
    } catch (err) {
      console.error('[LogRide] EXIF extraction failed:', err);
    } finally {
      setExtracting(false);
    }
  }

  // Import a COTREX-recorded (or any) GPX file: parse to a track, draw it, and
  // auto-fill the title / date / distance fields when they're still empty.
  async function handleGpx(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    setError('');
    try {
      const text = await file.text();
      const parsed = parseGpxToTrack(text);
      if (!parsed) {
        setTrackInfo('');
        setError("Couldn't read a track from that GPX file.");
        return;
      }
      setTrack(parsed.geometry);
      const miles = parsed.distanceMiles;
      setTrackInfo(`✓ Imported ${parsed.pointCount.toLocaleString()} track points · ${miles.toFixed(1)} mi`);
      // Only fill fields the user hasn't set meaningfully yet.
      setDistance(prev => (prev === '' ? miles.toFixed(1) : prev));
      if (parsed.startDateISO) setRideDate(prev => (!prev || prev === todayISO() ? parsed.startDateISO : prev));
      if (parsed.name) {
        setTitle(prev => (!prev.trim() || prev.startsWith('Ride on ') ? parsed.name : prev));
      }
    } catch (err) {
      console.error('[LogRide] GPX import failed:', err);
      setError("Couldn't read that GPX file.");
    }
  }

  function clearTrack() { setTrack(null); setTrackInfo(''); }

  function removePhoto(idx) {
    setPhotos(prev => {
      const target = prev[idx];
      if (target?.kind === 'new') URL.revokeObjectURL(target.url);
      if (target?.kind === 'existing') setRemovedPaths(r => [...r, target.photo.storage_path]);
      return prev.filter((_, i) => i !== idx);
    });
  }

  function addPin(pin) { setPins(prev => [...prev, pin]); }
  function updatePinLabel(idx, label) {
    setPins(prev => prev.map((p, i) => (i === idx ? { ...p, label } : p)));
  }
  function removePin(idx) { setPins(prev => prev.filter((_, i) => i !== idx)); }

  async function handleSave() {
    setError('');
    if (!title.trim()) { setError('Please enter a title.'); return; }
    if (!rideDate) { setError('Please choose a date.'); return; }
    if (!supabase || !user) { setError('You must be signed in to log a ride.'); return; }

    setSaving(true);
    setProgress('Saving ride…');
    try {
      const payload = {
        user_id: user.id,
        title: title.trim(),
        ride_date: rideDate,
        notes: notes.trim() || null,
        distance_miles: distance === '' ? null : Number(distance),
        duration_minutes: duration === '' ? null : Number(duration),
        elevation_gain_ft: elevation === '' ? null : Number(elevation),
        area_name: areaName.trim() || null,
        track_geojson: track || null,
        pins: pins.map(p => ({
          lat: p.lat,
          lng: p.lng,
          label: p.label || '',
          ...(p.source ? { source: p.source } : {}),
          ...(p.photo_filename ? { photo_filename: p.photo_filename } : {}),
        })),
      };

      let rideId;
      if (isEdit) {
        const { error: updErr } = await supabase
          .from('rides').update(payload).eq('id', editRide.id);
        if (updErr) throw updErr;
        rideId = editRide.id;

        // Delete photos the user removed (storage + rows).
        if (removedPaths.length) {
          await supabase.storage.from('ride-photos').remove(removedPaths);
          await supabase.from('ride_photos').delete().in('storage_path', removedPaths);
        }
      } else {
        const { data: ride, error: insErr } = await supabase
          .from('rides').insert(payload).select().single();
        if (insErr) throw insErr;
        rideId = ride.id;
      }

      // Upload any newly-selected photos.
      const newPhotos = photos.filter(p => p.kind === 'new');
      for (let i = 0; i < newPhotos.length; i++) {
        setProgress(`Uploading photo ${i + 1} of ${newPhotos.length}…`);
        const blob = await resizeImage(newPhotos[i].file);
        // Stamp with a per-batch offset so edit re-uploads don't collide.
        const path = photoPath(user.id, rideId, `${Date.now()}-${i}`, newPhotos[i].file.name);
        const { error: upErr } = await supabase
          .storage.from('ride-photos')
          .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
        if (upErr) throw upErr;
        const { error: rowErr } = await supabase
          .from('ride_photos')
          .insert({ ride_id: rideId, user_id: user.id, storage_path: path });
        if (rowErr) throw rowErr;
      }

      setProgress('');
      setSaving(false);
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error('[LogRide] save failed:', err);
      setError(err?.message || 'Could not save the ride. Please try again.');
      setSaving(false);
      setProgress('');
    }
  }

  return createPortal(
    <div className="ride-overlay" onClick={() => { if (!saving) onClose(); }}>
      <div className="ride-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="auth-close" onClick={() => { if (!saving) onClose(); }} aria-label="Close" disabled={saving}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" /><line x1="6" y1="18" x2="18" y2="6" />
          </svg>
        </button>

        <h2 className="ride-modal-title">{isEdit ? 'Edit Ride' : 'Log a Ride'}</h2>

        <div className="ride-form">
          <label className="auth-field">
            <span className="auth-label">Title *</span>
            <input className="auth-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ride title" />
          </label>

          <div className="ride-row">
            <label className="auth-field" style={{ flex: 1 }}>
              <span className="auth-label">Date *</span>
              <input className="auth-input" type="date" value={rideDate} onChange={(e) => setRideDate(e.target.value)} />
            </label>
            <label className="auth-field" style={{ flex: 1 }}>
              <span className="auth-label">Area</span>
              <input className="auth-input" value={areaName} onChange={(e) => setAreaName(e.target.value)} placeholder="e.g. Rampart Range, Cabin Ridge" />
            </label>
          </div>

          <label className="auth-field">
            <span className="auth-label">Notes</span>
            <textarea className="auth-input ride-textarea" rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How was the ride? Conditions, highlights, anything to remember…" />
          </label>

          <div className="ride-row">
            <label className="auth-field" style={{ flex: 1 }}>
              <span className="auth-label">Distance (mi)</span>
              <input className="auth-input" type="number" inputMode="decimal" min="0" step="0.1" value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="0" />
            </label>
            <label className="auth-field" style={{ flex: 1 }}>
              <span className="auth-label">Duration (min)</span>
              <input className="auth-input" type="number" inputMode="numeric" min="0" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="0" />
            </label>
            <label className="auth-field" style={{ flex: 1 }}>
              <span className="auth-label">Elev gain (ft)</span>
              <input className="auth-input" type="number" inputMode="numeric" min="0" value={elevation} onChange={(e) => setElevation(e.target.value)} placeholder="0" />
            </label>
          </div>

          <div className="auth-field">
            <span className="auth-label">Recorded track (GPX)</span>
            <input
              className="ride-file"
              type="file"
              accept=".gpx,application/gpx+xml,application/xml,text/xml"
              onChange={handleGpx}
            />
            {trackInfo && (
              <div className="ride-gps-note">
                {trackInfo}
                {track && <button type="button" className="fc-route-note-link" style={{ marginLeft: 8 }} onClick={clearTrack}>Remove</button>}
              </div>
            )}
            <span className="auth-hint" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
              Export a recorded ride from COTREX as GPX, then pick it here.
            </span>
          </div>

          <div className="auth-field">
            <span className="auth-label">Pins — tap the map to drop a location</span>
            <PinMap pins={pins} onAddPin={addPin} center={mapCenter} track={track} />
            {pins.length > 0 && (
              <div className="ride-pin-list">
                {pins.map((p, i) => (
                  <div className="ride-pin-item" key={i}>
                    <span className="ride-pin-num">{i + 1}</span>
                    {p.source === 'photo_exif' && (
                      <span className="ride-pin-photo-badge" title="Location auto-detected from photo">📷</span>
                    )}
                    <input
                      className="auth-input ride-pin-label"
                      value={p.label}
                      onChange={(e) => updatePinLabel(i, e.target.value)}
                      placeholder="Label (e.g. trailhead, viewpoint)"
                    />
                    <button className="ride-pin-remove" onClick={() => removePin(i)} aria-label="Remove pin">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="auth-field">
            <span className="auth-label">Photos</span>
            <input
              className="ride-file"
              type="file"
              accept="image/heic,image/heif,image/jpeg,image/jpg,image/png,image/*"
              multiple
              onChange={handleFiles}
            />
            {extracting && (
              <div className="ride-gps-note ride-gps-note-busy">
                <span className="fc-spinner" /> Detecting photo locations…
              </div>
            )}
            {!extracting && gpsStats.total > 0 && (
              <div className="ride-gps-note">
                {gpsStats.detected > 0
                  ? `✓ Auto-detected location from ${gpsStats.detected} of ${gpsStats.total} photo${gpsStats.total === 1 ? '' : 's'}`
                  : `No GPS location found in ${gpsStats.total} photo${gpsStats.total === 1 ? '' : 's'} — add pins by tapping the map`}
              </div>
            )}
            {photos.length > 0 && (
              <div className="ride-thumbs">
                {photos.map((p, i) => (
                  <div className="ride-thumb" key={i}>
                    {p.url ? <img src={p.url} alt={`Photo ${i + 1}`} /> : <div className="ride-thumb-loading"><span className="fc-spinner" /></div>}
                    <button className="ride-thumb-remove" onClick={() => removePhoto(i)} aria-label="Remove photo">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <div className="auth-error">{error}</div>}
          {saving && progress && (
            <div className="ride-progress"><span className="fc-spinner" />{progress}</div>
          )}

          <div className="ride-actions">
            <button className="ride-btn-cancel" onClick={() => { if (!saving) onClose(); }} disabled={saving}>Cancel</button>
            <button className="ride-btn-save" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Ride'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
