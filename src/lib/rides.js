// Ride logging helpers: image resize, EXIF GPS extraction, Supabase Storage
// paths/signed URLs, and the small bits of ride/photo CRUD shared by the modal,
// panel, and detail views. Every function degrades gracefully if Supabase isn't
// configured.
import { supabase } from './supabase';
import exifr from 'exifr';

export const PHOTO_BUCKET = 'ride-photos';
export const MAX_IMAGE_WIDTH = 1920;
export const SIGNED_URL_TTL = 3600; // 1 hour

// Palette used to color each ride's pins on the combined map view.
export const RIDE_PIN_COLORS = ['#06b6d4', '#a855f7', '#f97316', '#ec4899'];

export const COLORADO_CENTER = { lat: 39.0, lng: -105.5 };

// Format an ISO/date string as "May 28, 2026". Returns '' for empty input and
// never throws on a malformed value.
export function formatRideDate(value) {
  if (!value) return '';
  // Treat a bare YYYY-MM-DD as a local date (avoid the UTC-midnight off-by-one).
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + 'T00:00:00') : new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Today's date as YYYY-MM-DD in the user's local timezone (for <input type=date>).
export function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

// Client-side downscale: returns a JPEG Blob no wider than MAX_IMAGE_WIDTH.
// Falls back to the original File if anything goes wrong (e.g. HEIC the canvas
// can't decode) so an upload is never blocked by resizing.
export function resizeImage(file, maxWidth = MAX_IMAGE_WIDTH) {
  return new Promise((resolve) => {
    if (!file || !file.type?.startsWith('image/')) { resolve(file); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            resolve(blob || file);
          },
          'image/jpeg',
          0.85
        );
      } catch {
        URL.revokeObjectURL(url);
        resolve(file);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

// Extract GPS coordinates + capture timestamp from a photo's EXIF metadata.
// 100% client-side (no network); never throws — any missing field comes back
// null and a parse failure is logged and skipped. Works with iPhone HEIC/HEIF
// as well as JPEG/PNG.
export async function extractPhotoExif(file) {
  const result = { lat: null, lng: null, timestamp: null };
  if (!file) return result;

  // GPS — exifr.gps returns { latitude, longitude } or undefined.
  try {
    const gps = await exifr.gps(file);
    if (gps && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude)) {
      result.lat = gps.latitude;
      result.lng = gps.longitude;
    }
  } catch (err) {
    console.warn('[EXIF] GPS parse failed for', file?.name, err);
  }

  // Capture time — used to chronologically order the auto-pins.
  try {
    const meta = await exifr.parse(file, ['DateTimeOriginal']);
    const dt = meta?.DateTimeOriginal;
    if (dt) {
      const t = dt instanceof Date ? dt.getTime() : new Date(dt).getTime();
      if (Number.isFinite(t)) result.timestamp = t;
    }
  } catch (err) {
    console.warn('[EXIF] timestamp parse failed for', file?.name, err);
  }

  return result;
}

// Sanitize a filename to safe storage characters.
function safeName(name) {
  return String(name || 'photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
}

// Build the storage path for a photo: <user_id>/<ride_id>/<n>-<filename>.jpg
export function photoPath(userId, rideId, index, originalName) {
  const base = safeName(originalName).replace(/\.[^.]+$/, '');
  return `${userId}/${rideId}/${index}-${base}.jpg`;
}

// Resolve a batch of storage paths to short-lived signed URLs. Returns a map of
// { path: url }. Missing/failed entries are simply omitted (never throws).
export async function signedUrlsFor(paths) {
  const out = {};
  if (!supabase || !paths?.length) return out;
  try {
    const { data, error } = await supabase
      .storage.from(PHOTO_BUCKET)
      .createSignedUrls(paths, SIGNED_URL_TTL);
    if (error || !data) return out;
    for (const item of data) {
      if (item?.signedUrl && item?.path) out[item.path] = item.signedUrl;
    }
  } catch {
    /* leave out empty */
  }
  return out;
}

// Fetch all of the current user's rides (newest first), each with its photos.
export async function fetchRides() {
  if (!supabase) return [];
  const { data: rides, error } = await supabase
    .from('rides')
    .select('*')
    .order('ride_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;

  const ids = (rides || []).map(r => r.id);
  let photosByRide = {};
  if (ids.length) {
    const { data: photos } = await supabase
      .from('ride_photos')
      .select('*')
      .in('ride_id', ids)
      .order('created_at', { ascending: true });
    for (const p of photos || []) {
      (photosByRide[p.ride_id] ||= []).push(p);
    }
  }
  return (rides || []).map(r => ({ ...r, photos: photosByRide[r.id] || [] }));
}

// Delete a ride and all its photo objects from storage. The ride_photos rows
// and the storage cascade are handled by the DB FK, but storage objects must be
// removed explicitly.
export async function deleteRide(ride) {
  if (!supabase) throw new Error('Supabase not configured');
  const paths = (ride.photos || []).map(p => p.storage_path).filter(Boolean);
  if (paths.length) {
    await supabase.storage.from(PHOTO_BUCKET).remove(paths);
  }
  const { error } = await supabase.from('rides').delete().eq('id', ride.id);
  if (error) throw error;
}
