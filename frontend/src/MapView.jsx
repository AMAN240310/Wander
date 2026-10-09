import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { api } from './api.js';

function Fit({ points }) {
  const map = useMap();
  useEffect(() => { if (points.length) map.fitBounds(points, { padding: [40, 40], maxZoom: 16 }); }, [points, map]);
  return null;
}

export default function MapView() {
  const [list, setList] = useState(null);
  useEffect(() => { api.sightings().then(setList).catch(() => setList([])); }, []);
  if (!list) return <p className="note">Loading map…</p>;
  const placed = list.filter((x) => x.lat != null);
  if (!placed.length) return <p className="note">Nothing on the map yet. Photograph a plant and add it to your collection.</p>;
  return (
    <div className="bigmap">
      <MapContainer center={[placed[0].lat, placed[0].lng]} zoom={13} style={{ height: '100%' }}>
        <TileLayer attribution="© OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Fit points={placed.map((p) => [p.lat, p.lng])} />
        {placed.map((p) => (
          <CircleMarker key={p._id} center={[p.lat, p.lng]} radius={10} pathOptions={{ color: '#23402b', fillColor: '#e0b83a', fillOpacity: 0.9 }}>
            <Popup>
              <img src={p.thumbPath} alt="" style={{ width: 140, borderRadius: 6 }} />
              <br /><strong>{p.commonName}</strong><br /><em>{p.scientificName}</em><br />
              {new Date(p.takenAt).toLocaleDateString()}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
