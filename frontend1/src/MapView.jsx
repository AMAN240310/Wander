import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { api } from './api.js';
import { ago, computeStats, esc, pct, shortDate, SOURCE, FILL } from './lib.js';

const pinIcon = (s, active) =>
  L.divIcon({
    className: '',
    iconSize: [48, 60],
    iconAnchor: [24, 58],
    html: `<div class="flex flex-col items-center"><div class="w-12 h-12 rounded-full bg-surface-container-lowest shadow-xl flex items-center justify-center p-0.5 ${active ? 'ring-2 ring-primary' : ''}"><div class="w-full h-full rounded-full overflow-hidden bg-surface-variant"><img class="w-full h-full object-cover" alt="${esc(s.commonName)}" src="${esc(s.thumbPath)}"/></div></div><div class="w-2.5 h-2.5 bg-primary rotate-45 -mt-1.5 shadow-md"></div></div>`,
  });

function Fit({ points }) {
  const map = useMap();
  const key = JSON.stringify(points);
  useEffect(() => { if (points.length) map.fitBounds(points, { padding: [50, 50], maxZoom: 16 }); }, [key]); // eslint-disable-line
  return null;
}

export default function MapPage({ go }) {
  const [list, setList] = useState(null);
  const [species, setSpecies] = useState([]);
  const [query, setQuery] = useState('');
  const [selId, setSelId] = useState(null);
  const [map, setMap] = useState(null);

  useEffect(() => {
    api.sightings().then(setList).catch(() => setList([]));
    api.species().then(setSpecies).catch(() => {});
  }, []);

  const placed = useMemo(() => (list || []).filter((x) => x.lat != null), [list]);
  const shown = useMemo(() => {
    const q = query.toLowerCase().trim();
    return q ? placed.filter((x) => `${x.commonName} ${x.scientificName}`.toLowerCase().includes(q)) : placed;
  }, [placed, query]);
  const stats = useMemo(() => computeStats(placed, species.length), [placed, species]);
  const sel = shown.find((x) => x._id === selId) || shown[0];
  const points = shown.map((p) => [p.lat, p.lng]);

  if (!list) return <p className="px-margin py-space-lg font-body-md text-body-md text-on-surface-variant">Loading map…</p>;

  return (
    <div className="flex flex-col w-full">
      <div className="px-margin pt-space-xs pb-space-xs">
        <div className="flex items-center justify-between bg-surface-container-low px-space-md py-space-xs rounded-full shadow-sm">
          <div className="flex items-center gap-space-xs min-w-0">
            <span className="w-2 h-2 rounded-full bg-secondary-fixed-dim shrink-0"></span>
            <span className="material-symbols-outlined text-[16px] text-secondary shrink-0">pin_drop</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant truncate">{placed.length} {placed.length === 1 ? 'find' : 'finds'} mapped</span>
          </div>
          <span className="font-label-sm text-label-sm text-secondary font-semibold shrink-0 pl-space-xs">{stats.places} {stats.places === 1 ? 'place' : 'places'}</span>
        </div>
      </div>

      <div className="px-margin py-space-xs flex flex-col gap-space-xs">
        <div className="relative flex items-center w-full">
          <span className="material-symbols-outlined text-secondary absolute left-space-md text-[20px] pointer-events-none">search</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="w-full h-12 bg-surface-container-lowest text-on-surface font-body-md text-body-md pl-11 pr-10 rounded-xl shadow-sm focus:outline-none" placeholder="Search your finds by name..." type="text" />
          {query && (
            <button aria-label="Clear search" onClick={() => setQuery('')} className="absolute right-space-sm p-1 rounded-full text-on-surface-variant hover:text-primary">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-space-xs overflow-x-auto py-1 scrollbar-none">
          <span className="shrink-0 flex items-center gap-1.5 px-space-md py-1.5 bg-primary text-on-primary rounded-full shadow-sm">
            <span className="material-symbols-outlined text-[15px]" style={FILL}>eco</span>
            <span className="font-label-md text-label-md">My Finds ({shown.length})</span>
          </span>
        </div>
      </div>

      {placed.length === 0 ? (
        <div className="mx-margin mt-space-xs h-[300px] rounded-xl bg-surface-container-low shadow-inner flex flex-col items-center justify-center text-center gap-2 px-space-lg">
          <span className="material-symbols-outlined text-[40px] text-secondary">explore</span>
          <h2 className="font-headline-sm text-headline-sm text-primary">No finds on the map yet</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Photograph a plant and save it. It will appear here where you found it.</p>
          <button onClick={() => go('find')} className="mt-1 px-5 h-11 rounded-full bg-primary text-on-primary font-label-md text-label-md font-semibold">Find a plant</button>
        </div>
      ) : (
        <div className="relative isolate w-full h-[410px] mt-space-xs overflow-hidden select-none bg-surface-container-low shadow-inner">
          <MapContainer ref={setMap} center={[placed[0].lat, placed[0].lng]} zoom={13} zoomControl={false} style={{ height: '100%' }}>
            <TileLayer attribution="© OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Fit points={points} />
            {shown.map((p) => (
              <Marker key={p._id} position={[p.lat, p.lng]} icon={pinIcon(p, p._id === sel?._id)} eventHandlers={{ click: () => setSelId(p._id) }} />
            ))}
          </MapContainer>
          <div className="absolute top-space-sm left-space-sm flex items-center gap-1.5 z-[1000]">
            <div className="bg-surface-container-lowest/90 backdrop-blur-md py-1 px-2.5 rounded-full shadow-sm flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-primary">near_me</span>
              <span className="font-label-sm text-label-sm text-on-surface">{shown.length} shown</span>
            </div>
          </div>
          <div className="absolute top-space-sm right-space-sm flex flex-col gap-space-xs z-[1000]">
            <button aria-label="Zoom in" onClick={() => map?.zoomIn()} className="w-10 h-10 rounded-full bg-surface-container-lowest/95 backdrop-blur-md shadow-md flex items-center justify-center text-on-surface-variant hover:text-primary active:scale-90"><span className="material-symbols-outlined text-[20px]">add</span></button>
            <button aria-label="Zoom out" onClick={() => map?.zoomOut()} className="w-10 h-10 rounded-full bg-surface-container-lowest/95 backdrop-blur-md shadow-md flex items-center justify-center text-on-surface-variant hover:text-primary active:scale-90"><span className="material-symbols-outlined text-[20px]">remove</span></button>
            <button aria-label="Show all finds" onClick={() => points.length && map?.fitBounds(points, { padding: [50, 50], maxZoom: 16 })} className="w-10 h-10 rounded-full bg-surface-container-lowest/95 backdrop-blur-md shadow-md flex items-center justify-center text-primary-container hover:bg-surface-container-low active:scale-90"><span className="material-symbols-outlined text-[20px]" style={FILL}>my_location</span></button>
          </div>
        </div>
      )}

      {placed.length > 0 && (
        <div className="px-margin py-space-sm bg-surface-container-low shadow-sm">
          <div className="flex items-center justify-between gap-space-xs overflow-x-auto scrollbar-none">
            {[
              ['format_list_bulleted', 'bg-secondary-container', 'text-primary-container', 'text-primary', stats.finds, 'Finds logged'],
              ['filter_vintage', 'bg-tertiary-fixed', 'text-tertiary-container', 'text-tertiary', stats.species, 'Species'],
              ['pin_drop', 'bg-secondary-fixed-dim', 'text-on-secondary-fixed-variant', 'text-secondary', stats.places, 'Places'],
            ].map(([icon, bg, ic, num, v, label]) => (
              <div key={label} className="flex items-center gap-2 bg-surface-container-lowest px-space-sm py-1.5 rounded-xl shadow-sm min-w-[105px]">
                <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                  <span className={`material-symbols-outlined text-[16px] ${ic}`} style={FILL}>{icon}</span>
                </div>
                <div className="flex flex-col">
                  <span className={`font-title-md text-title-md leading-none ${num}`}>{v}</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant truncate">{label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sel && (
        <div className="px-margin pt-space-xs pb-space-md">
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-md flex flex-col gap-space-sm">
            <div className="w-10 h-1 bg-surface-dim rounded-full mx-auto -mt-1 mb-1"></div>
            <div className="flex items-start justify-between gap-space-sm">
              <div className="flex gap-space-sm min-w-0">
                <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 shadow-sm bg-surface-variant relative">
                  <img className="w-full h-full object-cover" alt="" src={sel.thumbPath} />
                  <span className="absolute bottom-1 right-1 bg-primary text-on-primary rounded-full p-0.5"><span className="material-symbols-outlined text-[12px] block">verified</span></span>
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="font-headline-sm text-headline-sm text-primary truncate leading-tight">{sel.commonName}</h3>
                  <p className="font-body-sm text-body-sm italic text-on-surface-variant">{sel.scientificName}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="inline-flex items-center gap-0.5 bg-primary-fixed text-on-primary-fixed-variant px-1.5 py-0.5 rounded text-[10px] font-semibold">
                      <span className="material-symbols-outlined text-[12px]">check_circle</span>{pct(sel.confidence)}% AI Match
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 py-1 font-body-sm text-body-sm text-on-surface-variant">
              <div className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px] text-secondary">schedule</span><span>{ago(sel.takenAt)}</span></div>
              <div className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px] text-secondary">calendar_today</span><span>{shortDate(sel.takenAt)}</span></div>
              <div className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px] text-secondary">pin_drop</span><span>{SOURCE[sel.locationSource] || 'Saved location'}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-space-sm pt-space-xs">
              <a href={`https://www.openstreetmap.org/?mlat=${sel.lat}&mlon=${sel.lng}#map=17/${sel.lat}/${sel.lng}`} target="_blank" rel="noreferrer" className="h-12 flex items-center justify-center gap-1.5 bg-surface-container-high text-on-surface rounded-full shadow-sm hover:bg-surface-variant transition-colors active:scale-95">
                <span className="material-symbols-outlined text-[18px] text-secondary">directions_walk</span>
                <span className="font-label-lg text-label-lg font-semibold">Open in Maps</span>
              </a>
              <button onClick={() => go('collection')} className="h-12 flex items-center justify-center gap-1.5 bg-primary-container text-on-primary rounded-full shadow-md hover:bg-primary transition-colors active:scale-95">
                <span className="material-symbols-outlined text-[18px]">menu_book</span>
                <span className="font-label-lg text-label-lg font-semibold">View Field Log</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
