import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMapEvents } from 'react-leaflet';
import { api } from './api.js';
import { ago, pct, SOURCE } from './lib.js';
import { ChatThread } from './Chat.jsx';

const TIPS = [
  'Keep the flower head centered and capture the leaf underside for higher match accuracy.',
  'In deep shade, move to a brighter spot or use your phone flash so the colors come through.',
  'Avoid shaking stems in wind: gently stabilize the stem base with two fingers.',
];

// Browsers only allow geolocation on HTTPS or localhost; on plain LAN HTTP this resolves to null.
const getPosition = () =>
  new Promise((resolve) => {
    if (!window.isSecureContext || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { timeout: 4000 },
    );
  });

function PinPicker({ pin, onPick }) {
  useMapEvents({ click: (e) => onPick(e.latlng) });
  return pin ? <CircleMarker center={[pin.lat, pin.lng]} radius={10} pathOptions={{ color: '#fff', weight: 3, fillColor: '#012d1d', fillOpacity: 1 }} /> : null;
}

const Bracket = ({ d, cx, cy }) => (
  <svg className="w-7 h-7 text-primary-fixed drop-shadow" fill="none" viewBox="0 0 28 28">
    <path d={d} stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
    <circle cx={cx} cy={cy} fill="currentColor" r="2" />
  </svg>
);

export default function Find({ onUnlock, go }) {
  const [health, setHealth] = useState(null);
  const [recent, setRecent] = useState([]);
  const [total, setTotal] = useState(0);
  const [tip, setTip] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [s, setS] = useState(null);
  const [names, setNames] = useState({ commonName: '', scientificName: '' });
  const [pin, setPin] = useState(null);
  const [ask, setAsk] = useState(false);

  const refresh = () => api.sightings().then((l) => { setRecent(l.slice(0, 3)); setTotal(l.length); }).catch(() => {});
  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth({ ai: false }));
    refresh();
  }, []);

   const reset = () => { setS(null); setPin(null); setError(''); setAsk(false); };
  const onFile = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    reset();
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
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

  const save = async () => {
    try {
      const r = await api.confirm(s._id, names);
      onUnlock(r.newAchievements);
      reset();
      refresh();
    } catch (err) { setError(err.message); }
  };

  const ai = health?.ai;
  const chip = busy ? 'Identifying…' : s ? 'Specimen captured' : 'Ready to capture';

  return (
    <div className="flex flex-col w-full">
      {/* Local AI status */}
      <div className="px-margin pt-space-xs pb-space-sm flex items-center justify-between">
        <div className="inline-flex items-center gap-space-xs px-3 py-1 rounded-full bg-surface-container-high text-on-surface shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${ai === false ? 'bg-error' : 'bg-primary'}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${ai === false ? 'bg-error' : 'bg-primary'}`}></span>
          </span>
          <span className="font-label-sm text-label-sm text-primary tracking-wide uppercase">
            {ai === false ? 'AI service not reachable' : 'Local AI Ready • On-Device'}
          </span>
        </div>
      </div>

      {/* Viewfinder */}
      <div className="px-margin pb-space-sm">
        <div className="relative w-full rounded-xl overflow-hidden shadow-md bg-inverse-surface aspect-[4/5] flex flex-col justify-between p-3.5">
          {preview
            ? <div className="absolute inset-0 bg-cover bg-center opacity-85" style={{ backgroundImage: `url(${preview})` }}></div>
            : <div className="absolute inset-0 bg-gradient-to-br from-primary-container to-primary"></div>}
          <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-primary/40 pointer-events-none"></div>

          <div className="relative z-10 flex items-center justify-between w-full">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface/85 backdrop-blur-md text-on-surface shadow-sm">
              <span className="material-symbols-outlined text-secondary text-[16px]">center_focus_weak</span>
              <span className="font-label-sm text-label-sm text-on-surface">{chip}</span>
            </div>
          </div>

          <div className="relative z-10 self-center my-auto w-56 h-56 flex items-center justify-center pointer-events-none">
            <div className="absolute inset-0 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <Bracket d="M2 18V6C2 3.79086 3.79086 2 6 2H18" cx="6" cy="6" />
                <Bracket d="M26 18V6C26 3.79086 24.2091 2 22 2H10" cx="22" cy="6" />
              </div>
              <div className="flex justify-between items-end">
                <Bracket d="M2 10V22C2 24.2091 3.79086 26 6 26H18" cx="6" cy="22" />
                <Bracket d="M26 10V22C26 24.2091 24.2091 26 22 26H10" cx="22" cy="22" />
              </div>
            </div>
            <div className={`w-16 h-16 rounded-full bg-surface-container-lowest/15 flex items-center justify-center ${busy ? 'animate-pulse' : ''}`}>
              <div className="w-3 h-3 rounded-full bg-primary-fixed shadow-sm"></div>
            </div>
            <div className="absolute -bottom-3 px-3 py-1 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm flex items-center gap-1.5 shadow-md">
              <span className="material-symbols-outlined text-[13px] text-tertiary-fixed">psychology</span>
              <span>{busy ? 'The local model is reading your photo' : 'Center the flower or leaf'}</span>
            </div>
          </div>

          <div className="relative z-10 w-full flex items-end justify-between">
            <div className="bg-surface/90 backdrop-blur-md rounded-lg px-3 py-1.5 max-w-[240px] shadow-sm">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-secondary-container"></span>
                <span className="font-label-md text-label-md text-on-surface truncate">{s ? s.scientificName || s.commonName : 'No specimen yet'}</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                {s ? `${s.commonName} • ${pct(s.confidence)}% likeness` : 'Take or choose a photo below'}
              </p>
            </div>
            {s && (
              <div className="bg-surface/85 backdrop-blur-md px-2 py-1 rounded-full text-on-surface font-label-sm text-label-sm flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-on-surface-variant">timer</span>
                <span>{(s.latencyMs / 1000).toFixed(1)} s</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && !s && <p className="px-margin pb-space-sm font-body-sm text-body-sm text-error font-semibold" role="alert">{error}</p>}

      {/* Capture actions */}
      <div className="px-margin pb-space-md">
        <div className="bg-surface-container-low rounded-xl p-3 shadow-sm flex items-center justify-around">
          <label className="flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 text-on-surface-variant hover:text-primary active:scale-95 transition-all cursor-pointer focus-within:text-primary">
            <input type="file" accept="image/*" className="sr-only" onChange={onFile} disabled={busy} />
            <div className="w-11 h-11 rounded-full bg-surface-container flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[22px]">photo_library</span>
            </div>
            <span className="font-label-sm text-label-sm mt-1">Gallery</span>
          </label>
          <label className="relative group flex items-center justify-center active:scale-95 transition-transform cursor-pointer focus-within:ring-4 focus-within:ring-tertiary-fixed-dim rounded-full" aria-label="Photograph a plant">
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={onFile} disabled={busy} />
            <div className={`w-[74px] h-[74px] rounded-full bg-primary-container p-1 shadow-md flex items-center justify-center ${busy ? 'opacity-60' : ''}`}>
              <div className="w-full h-full rounded-full bg-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary text-[34px]">{busy ? 'hourglass_top' : 'photo_camera'}</span>
              </div>
            </div>
          </label>
          <button onClick={() => go('collection')} className="flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 text-on-surface-variant hover:text-primary active:scale-95 transition-all">
            <div className="w-11 h-11 rounded-full bg-surface-container flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[22px]">filter_vintage</span>
            </div>
            <span className="font-label-sm text-label-sm mt-1">Collection</span>
          </button>
        </div>
      </div>

      {/* Tip */}
      <div className="px-margin pb-space-lg">
        <div className="bg-surface-container rounded-lg p-3 shadow-sm flex items-start gap-3 relative overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex-shrink-0 flex items-center justify-center mt-0.5">
            <span className="material-symbols-outlined text-[18px]">lightbulb</span>
          </div>
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-1.5">
              <span className="font-label-md text-label-md text-tertiary-container uppercase tracking-wider">Botanist Pro-Tip</span>
              <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">{tip + 1} of {TIPS.length}</span>
            </div>
            <p className="font-body-md text-body-md text-on-surface mt-0.5 leading-snug">{TIPS[tip]}</p>
          </div>
          <button aria-label="Next tip" onClick={() => setTip((tip + 1) % TIPS.length)} className="w-7 h-7 rounded-full bg-surface hover:bg-surface-container-high text-on-surface-variant flex items-center justify-center self-center shadow-xs">
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Recent finds */}
      <div className="px-margin pb-space-xl">
        <div className="flex items-center justify-between pb-space-sm">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[20px]">history_edu</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Recent Field Finds</h2>
          </div>
          {total > 0 && (
            <button className="font-label-md text-label-md text-primary font-semibold hover:underline" onClick={() => go('collection')}>See All ({total})</button>
          )}
        </div>
        {recent.length === 0 ? (
          <div className="bg-surface-container-low rounded-lg p-4 shadow-sm font-body-md text-body-md text-on-surface-variant">
            Nothing here yet. Photograph a plant, then save it to start your field log.
          </div>
        ) : (
          <div className="space-y-space-sm">
            {recent.map((r) => (
              <div key={r._id} className="bg-surface-container-low rounded-lg p-2.5 shadow-sm flex items-center gap-3 hover:bg-surface-container transition-colors">
                <div className="w-16 h-16 rounded bg-cover bg-center flex-shrink-0" style={{ backgroundImage: `url(${r.thumbPath})` }}></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-title-md text-title-md text-on-surface truncate">{r.commonName}</span>
                    <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold flex-shrink-0">{pct(r.confidence)}% Match</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant italic truncate">{r.scientificName}</p>
                  <div className="flex items-center gap-2 mt-1 font-label-sm text-label-sm text-outline">
                    <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-[13px]">schedule</span><span>{ago(r.takenAt)}</span></span>
                    {r.locationSource && (<><span>•</span><span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-[13px]">pin_drop</span><span>{SOURCE[r.locationSource]}</span></span></>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Result sheet */}
      {s && (
        <div className="fixed inset-0 z-[60] bg-inverse-surface/40 backdrop-blur-sm flex items-end justify-center p-margin pb-safe">
          <div className="w-full max-w-sm max-h-[88vh] overflow-y-auto bg-surface rounded-xl p-4 shadow-xl flex flex-col gap-3">
            <div className="w-10 h-1 rounded-full bg-outline-variant mx-auto mb-1"></div>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">{s.isPlant ? 'verified' : 'help'}</span>
                <div>
                  <h3 className="font-title-md text-title-md text-on-surface">{s.isPlant ? 'Specimen Identified!' : 'Not sure this is a plant'}</h3>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">Processed on-device in {(s.latencyMs / 1000).toFixed(1)} s</p>
                </div>
              </div>
              <button aria-label="Discard" className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant" onClick={reset}>
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <div className="bg-surface-container rounded-lg p-3 flex items-start gap-3">
              <img src={s.thumbPath} alt="Your photo" className="w-16 h-16 rounded object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-1">
                <label className="block">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Common name</span>
                  <input className="w-full bg-transparent border-b border-outline-variant focus:border-primary focus:outline-none font-title-md text-title-md text-on-surface" value={names.commonName} onChange={(e) => setNames({ ...names, commonName: e.target.value })} />
                </label>
                <label className="block">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Scientific name</span>
                  <input className="w-full bg-transparent border-b border-outline-variant focus:border-primary focus:outline-none font-body-md text-body-md italic text-on-surface-variant" value={names.scientificName} onChange={(e) => setNames({ ...names, scientificName: e.target.value })} />
                </label>
                <span className={`font-label-sm text-label-sm font-bold ${pct(s.confidence) < 40 ? 'text-error' : 'text-primary'}`}>{pct(s.confidence)}% Match Confidence</span>
              </div>
            </div>

            {pct(s.confidence) < 40 && <p className="font-body-sm text-body-sm text-error font-semibold">The model is not confident. Check the look-alikes before you save.</p>}
            {!s.isPlant && <p className="font-body-sm text-body-sm text-error font-semibold">This doesn't look like a plant. Try a closer photo.</p>}
            {s.summary && <p className="font-body-sm text-body-sm text-on-surface leading-relaxed bg-surface-container-low p-2.5 rounded-lg">{s.summary}</p>}
            {s.features?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {s.features.map((f) => <span key={f} className="bg-secondary-container text-on-secondary-container font-label-sm text-label-sm px-2 py-0.5 rounded-full">{f}</span>)}
              </div>
            )}
            {s.lookAlikes?.length > 0 && <p className="font-body-sm text-body-sm text-on-surface-variant"><span className="font-semibold text-on-surface">Could also be:</span> {s.lookAlikes.join(', ')}</p>}

            {s.lat != null ? (
              <p className="flex items-center gap-1 font-body-sm text-body-sm text-secondary"><span className="material-symbols-outlined text-[16px]">pin_drop</span>{SOURCE[s.locationSource] || 'Location saved'}</p>
            ) : (
              <div className="space-y-2">
                <p className="flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant"><span className="material-symbols-outlined text-[16px] text-secondary">pin_drop</span>No location found. Tap the map where you took the photo.</p>
                <div className="h-56 rounded-lg overflow-hidden isolate">
                  <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%' }}>
                    <TileLayer attribution="© OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <PinPicker pin={pin} onPick={setPin} />
                  </MapContainer>
                </div>
                <button disabled={!pin} onClick={savePin} className="w-full h-11 rounded-full bg-surface-container-high text-on-surface font-label-lg text-label-lg disabled:opacity-40">Save this location</button>
              </div>
            )}
                <button onClick={() => setAsk(!ask)} className="h-11 rounded-full bg-surface-container-high text-on-surface font-label-lg text-label-lg flex items-center justify-center gap-1.5 active:scale-95 transition-transform">
                 <span className="material-symbols-outlined text-[18px] text-secondary">forum</span>
                 <span>{ask ? 'Hide questions' : 'Ask a follow-up question'}</span>
               </button>
               {ask && <ChatThread id={s._id} />}

            <p className="bg-tertiary-fixed text-on-tertiary-fixed rounded-lg p-2.5 font-body-sm text-body-sm flex gap-1.5">
              <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">warning</span>
              AI guesses can be wrong. Never eat or handle plants based on this.
            </p>
            {error && <p className="font-body-sm text-body-sm text-error font-semibold" role="alert">{error}</p>}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button onClick={save} disabled={s.lat == null || !s.isPlant} className="h-12 rounded-full bg-primary text-on-primary font-label-lg text-label-lg font-semibold flex items-center justify-center gap-1 shadow-sm active:scale-95 transition-transform disabled:opacity-40">
                <span className="material-symbols-outlined text-[18px]">bookmark_add</span><span>Save to Field Log</span>
              </button>
              <button onClick={reset} className="h-12 rounded-full bg-secondary-container text-on-secondary-container font-label-lg text-label-lg font-semibold flex items-center justify-center gap-1 active:scale-95 transition-transform">
                <span className="material-symbols-outlined text-[18px]">delete</span><span>Discard</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
