import { useState, useEffect, useRef } from 'react';

const WMO = {
  0: 'Clear', 1: 'Mostly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Freezing Fog',
  51: 'Light Drizzle', 53: 'Drizzle', 55: 'Heavy Drizzle',
  61: 'Light Rain', 63: 'Rain', 65: 'Heavy Rain',
  71: 'Light Snow', 73: 'Snow', 75: 'Heavy Snow', 77: 'Sleet',
  80: 'Showers', 81: 'Showers', 82: 'Heavy Showers',
  85: 'Snow Showers', 86: 'Heavy Snow',
  95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Thunderstorm',
};

export default function WeatherWidget({ mapRef }) {
  const [wx, setWx] = useState(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const listenerRef = useRef(null);
  const mountedRef = useRef(true);

  async function fetchWx(lat, lng) {
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&current=temperature_2m,wind_speed_10m,precipitation,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`
      );
      const data = await res.json();
      if (!mountedRef.current) return;
      const c = data.current;
      setWx({
        temp: Math.round(c.temperature_2m),
        wind: Math.round(c.wind_speed_10m),
        precip: c.precipitation,
        label: WMO[c.weather_code] ?? 'Unknown',
        elev: data.elevation != null ? Math.round(data.elevation) : null,
      });
    } catch {
      // fail silently — weather is non-critical
    }
    if (mountedRef.current) setLoading(false);
  }

  useEffect(() => {
    mountedRef.current = true;
    let attempts = 0;

    const poll = setInterval(() => {
      const map = mapRef.current;
      if (map) {
        clearInterval(poll);
        const center = map.getCenter();
        if (center) fetchWx(center.lat(), center.lng());

        listenerRef.current = map.addListener('idle', () => {
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            const c = map.getCenter();
            if (c && mountedRef.current) fetchWx(c.lat(), c.lng());
          }, 2500);
        });
      }
      if (++attempts > 20) clearInterval(poll);
    }, 500);

    return () => {
      mountedRef.current = false;
      clearInterval(poll);
      clearTimeout(debounceRef.current);
      try {
        if (listenerRef.current) google.maps.event.removeListener(listenerRef.current);
      } catch {}
    };
  }, [mapRef]);

  if (!wx && !loading) return null;

  return (
    <div className="weather-widget">
      {loading && !wx ? (
        <div className="weather-loading-row">
          <span className="weather-spinner" />
        </div>
      ) : wx ? (
        <>
          <div className="weather-temp">{wx.temp}°F</div>
          <div className="weather-label">{wx.label}</div>
          <div className="weather-meta">
            <span>Wind {wx.wind} mph</span>
            {wx.elev != null && <span>{wx.elev.toLocaleString()} ft</span>}
          </div>
          {wx.precip > 0 && (
            <div className="weather-precip">{wx.precip}" precip</div>
          )}
        </>
      ) : null}
    </div>
  );
}
