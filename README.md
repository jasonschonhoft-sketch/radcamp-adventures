# RadCamp Adventures

I built RadCamp because I was tired of juggling four or five different apps every time I wanted to ride. One app for trails, another for camping, Google for shops, something else to track the ride — and my friends had the exact same problem. No single tool existed that brought it all together for moto and mountain bike riders in Colorado. So I built it.

RadCamp is a Colorado trail and campground discovery platform for OHV, dirt bike, and mountain bike riders. Find trails by activity type, plan routes, check weather, locate campgrounds, and find nearby shops — all in one map-first interface.

🌐 [radcampadventures.com](https://radcampadventures.com)

-----

## Trail Types

- Moto
- MTB
- Road Bike
- Gravel Bike
- E-Bike
- OHV / Dirt Bike

-----

## Features

**Trail Discovery**

- Activity-based trail filtering with multi-select support
- First-load welcome modal with multi-select activity picker and URL deep links
- Highlight Singletrack toggle — singletrack renders bright lime green over its parent activity color (on by default); toggle off to show singletrack in its native activity color
- Trail popups with satellite thumbnails, surface type, road name, and COTREX trail data

**Route Planning**

- Route planning mode with per-segment selection (keyed by COTREX `OBJECTID`)
- Click-to-toggle segment removal
- Live total mileage calculation
- Shareable route link and Maps integration

**Campgrounds & Shops**

- Campground overlay with official federal data (Forest Service, BLM, NPS) from Recreation.gov
- Campground popups with Reserve on Recreation.gov and Get Directions actions
- Campground data refetches on map pan with debounce and distance-skip guards
- Nearby shops finder

**Weather**

- Floating weather card showing current temperature, wind speed, conditions, and elevation for the map center

**Mobile & PWA**

- Full-screen map on mobile with floating filter button and active-count badge
- Desktop/mobile responsive sidebar with trail-type filters
- iOS homescreen support (installable as PWA with custom icon)

-----

## Tech Stack

- **Frontend:** React + Vite
- **Maps:** `@vis.gl/react-google-maps`
- **Hosting:** Vercel
- **Language:** JavaScript

-----

## APIs & Data Sources

- **COTREX** — Colorado Trail Explorer; source of trail geometry and segment metadata (each polyline is a segment keyed by `OBJECTID`)
- **Google Places API** — Shop discovery and place lookups
- **Google Static Maps API** — Satellite thumbnails in trail popups
- **Recreation.gov RIDB API** — Official federal campground data via `/api/v1/facilities` (`activity=CAMPING`, `state=CO`)
- **Open-Meteo** — Current weather conditions (temperature, wind, precipitation, weather code) for map center coordinates
- **Anthropic API** — AI-generated trail descriptions (currently reverted after a runtime crash; planned to return)

-----

## Environment Variables

Set in Vercel (not committed to repo):

```
VITE_GOOGLE_MAPS_API_KEY   # Google Maps, Places, Static Maps
VITE_RECGOV_API_KEY        # Recreation.gov RIDB
```

> **Local build note:** A missing `VITE_GOOGLE_MAPS_API_KEY` causes Vite to dead-code-eliminate the entire app — the local bundle renders only the API-key-error screen and won’t reflect component changes. Use dummy key values locally or test against the Vercel deployment.

-----

## Development

```bash
# Install dependencies
npm install

# Check for build errors before deploying
npx vite build 2>&1 | tail -20

# Deploy — push to main, Vercel auto-deploys
git push origin main
```

**Debugging workflow:**

1. `npx vite build 2>&1 | tail -20` — catch build errors
1. Browser DevTools Console on the live domain — catch runtime errors
1. Test on iPhone via the live domain, not localhost

-----

## Roadmap

**Near-term**

- [ ] Re-introduce AI trail descriptions
- [ ] User accounts and profiles
- [ ] Ride logging
- [ ] Photo uploads
- [ ] Real-time crowdsourced trail conditions
- [ ] Offline map caching
- [ ] Weather features expansion

**Bigger features**

- [ ] Stewardship logs and gamified score/badges
- [ ] Group rides and meetups organizer
- [ ] Crowdsourced trail-fix database
- [ ] Follow other riders

**Partnerships / v2+**

- [ ] AirBnB/VRBO lodging links
- [ ] Live parts inventory from local shops
- [ ] Backcountry mechanical dispatch
- [ ] Satellite/off-grid connectivity
- [ ] AR trail junction overlay
- [ ] Social feeds and achievement sharing
- [ ] Smart garage routing (same year/make/model owners)
- [ ] Expansion beyond OHV/dirt bike to all outdoor activity types

-----

## Repo

GitHub: `jasonschonhoft-sketch/radcamp-adventures`  
Local path: `/Users/jtschonhoft/radcamp-adventures/radcamp-app`

-----

## License

© RadCamp Adventures. All rights reserved.
