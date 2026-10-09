import { useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMapEvents } from 'react-leaflet';
import { api } from './api.js';

const getPosition = () =>
  new Promise((resolve) => {
    // Browsers only allow geolocation on HTTPS or localhost; on plain LAN HTTP this resolves to null.
    if (!window.isSecureContext || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { timeout: 4000 },
    );
  });

function PinPicker({ pin, onPick }) {
  useMapEvents({ click: (e) => onPick(e.latlng) });
  return pin ? <CircleMarker center={[pin.lat, pin.lng]} radius={9} pathOptions={{ color: '#23402b', fillOpacity: 0.8 }} /> : null;
}

export default function Capture({ onUnlock }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [s, setS] = useState(null);
  const [names, setNames] = useState({ commonName: '', scientificName: '' });
  const [pin, setPin] = useState(null);

  const reset = () => { setS(null); setPin(null); setError(''); };

  const onFile = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    reset();
    setBusy(true);
    try {
      const res = await api.identify(file, await getPosition());
      setS(res);
      setNames({ commonName: res.commonName, scientificName: res.scientificName });
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  const savePin = async () => {
    try { await api.setLocation(s._id, pin.lat, pin.lng); setS({ ...s, lat: pin.lat, lng: pin.lng, locationSource: 'pin' }); }
    catch (err) { setError(err.message); }
  };

  const confirm = async () => {
    try {
      const r = await api.confirm(s._id, names);
      onUnlock(r.newAchievements);
      reset();
    } catch (err) { setError(err.message); }
  };

  return (
    <section>
      {!s && (
        <label className={`shutter ${busy ? 'busy' : ''}`}>
          <input type="file" accept="image/*" capture="environment" onChange={onFile} disabled={busy} hidden />
          {busy ? 'Looking closely…' : 'Photograph a plant'}
        </label>
      )}
      {busy && <p className="note">The local model is working. The first photo is slowest while it loads.</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {s && (
        <article className="card">
          <img src={s.thumbPath} alt="Your photo" />
          <label>Common name<input value={names.commonName} onChange={(e) => setNames({ ...names, commonName: e.target.value })} /></label>
          <label>Scientific name<input value={names.scientificName} onChange={(e) => setNames({ ...names, scientificName: e.target.value })} /></label>
          <p className="meta">Model confidence {Math.round(s.confidence * 100)}% · {s.latencyMs} ms</p>
          <p>{s.summary}</p>
          {s.features?.length > 0 && <div className="chips">{s.features.map((f) => <span key={f}>{f}</span>)}</div>}
          {s.lookAlikes?.length > 0 && <p className="meta">Could also be: {s.lookAlikes.join(', ')}</p>}
          {!s.isPlant && <p className="error">This doesn't look like a plant. Try a closer photo.</p>}
          {s.lat == null && (
            <>
              <p className="note">No location found. Tap the map where you took the photo.</p>
              <div className="pinmap">
                <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%' }}>
                  <TileLayer attribution="© OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <PinPicker pin={pin} onPick={setPin} />
                </MapContainer>
              </div>
              <button className="ghost" disabled={!pin} onClick={savePin}>Save this location</button>
            </>
          )}
          <p className="warn">AI guesses can be wrong. Never eat or handle plants based on this.</p>
          <div className="row">
            <button className="primary" onClick={confirm} disabled={s.lat == null || !s.isPlant}>Add to collection</button>
            <button className="ghost" onClick={reset}>Discard</button>
          </div>
        </article>
      )}
    </section>
  );
}
