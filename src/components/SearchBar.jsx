import { useRef, useEffect, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

const CO_BOUNDS = { north: 41.0, south: 36.9, east: -102.0, west: -109.1 };

export default function SearchBar({ onPlaceSelect }) {
  const inputRef = useRef(null);
  const [autocomplete, setAutocomplete] = useState(null);
  const placesLib = useMapsLibrary('places');

  useEffect(() => {
    if (!placesLib || !inputRef.current) return;
    const bounds = new google.maps.LatLngBounds(
      { lat: CO_BOUNDS.south, lng: CO_BOUNDS.west },
      { lat: CO_BOUNDS.north, lng: CO_BOUNDS.east }
    );
    const ac = new placesLib.Autocomplete(inputRef.current, {
      bounds,
      strictBounds: false,
      fields: ['geometry', 'name'],
    });
    setAutocomplete(ac);
    return () => google.maps.event.clearInstanceListeners(ac);
  }, [placesLib]);

  useEffect(() => {
    if (!autocomplete) return;
    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.geometry?.location) return;
      onPlaceSelect({
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        viewport: place.geometry.viewport ?? null,
      });
      inputRef.current.blur();
    });
    return () => google.maps.event.removeListener(listener);
  }, [autocomplete, onPlaceSelect]);

  return (
    <div className="search-bar">
      <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input
        ref={inputRef}
        type="text"
        placeholder="Search Colorado..."
        className="search-input"
      />
    </div>
  );
}
