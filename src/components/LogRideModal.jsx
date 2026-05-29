import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Map as GoogleMap, Marker } from '@vis.gl/react-google-maps';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  resizeImage, photoPath, todayISO, formatRideDate, signedUrlsFor, COLORADO_CENTER,
} from '../lib/rides';

// Interactive pin-drop map. Tap to drop a pin; pins come from / go to parent.
function PinMap({ pins, onAddPin, center }) {
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
  // photos: { kind:'new', file, url } | { kind:'existing', photo, url }
  const [photos, setPhotos] = useState([]);
  const [removedPaths, setRemovedPaths] = useState([]); // existing storage_paths to delete on save
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState('');

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
    if (isEdit) {
      setTitle(editRide.title || '');
      setRideDate(editRide.ride_date || todayISO());
      setAreaName(editRide.area_name || '');
      setNotes(editRide.notes || '');
      setDistance(editRide.distance_miles ?? '');
      setDuration(editRide.duration_minutes ?? '');
      setElevation(editRide.elevation_gain_ft ?? '');
      setPins(Array.isArray(editRide.pins) ? editRide.pins.map(p => ({ ...p, label: p.label || '' })) : []);
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

  function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    const next = files.map(file => ({ kind: 'new', file, url: URL.createObjectURL(file) }));
    setPhotos(prev => [...prev, ...next]);
    e.target.value = '';
  }

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
        pins: pins.map(p => ({ lat: p.lat, lng: p.lng, label: p.label || '' })),
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
            <span className="auth-label">Pins — tap the map to drop a location</span>
            <PinMap pins={pins} onAddPin={addPin} center={mapCenter} />
            {pins.length > 0 && (
              <div className="ride-pin-list">
                {pins.map((p, i) => (
                  <div className="ride-pin-item" key={i}>
                    <span className="ride-pin-num">{i + 1}</span>
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
            <input className="ride-file" type="file" accept="image/*" multiple onChange={handleFiles} />
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
