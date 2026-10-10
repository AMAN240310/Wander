import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { ago, pct } from './lib.js';

const STARTERS = [
  'Why did you pick this plant?',
  'What else could it be?',
  'How do I tell it apart from its look-alikes?',
  'What should I photograph to be sure?',
];

// Gemma writes light markdown; show it as plain text.
const plain = (t = '') => t.replace(/\*\*(.*?)\*\*/g, '$1').replace(/^\s*[*-]\s+/gm, '• ').replace(/^#+\s*/gm, '');

export function ChatThread({ id, sticky }) {
  const [chat, setChat] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const end = useRef(null);

  useEffect(() => {
    setChat([]); setError('');
    api.sighting(id).then((s) => setChat(s.chat || [])).catch(() => {});
  }, [id]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [chat, busy]);

  const send = async (q) => {
    const message = (q ?? text).trim();
    if (!message || busy) return;
    setText(''); setError(''); setBusy(true);
    setChat((c) => [...c, { role: 'user', content: message }]);
    try {
      const r = await api.chat(id, message);
      setChat(r.chat);
    } catch (e) {
      setError(e.message);
      setChat((c) => c.slice(0, -1));
      setText(message);
    }
    setBusy(false);
  };

  const clear = async () => { await api.clearChat(id).catch(() => {}); setChat([]); };

  const input = (
    <div className="flex items-center gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && send()}
        disabled={busy}
        maxLength={1000}
        placeholder="Ask a question about this plant..."
        className="flex-1 h-12 bg-surface-container-lowest text-on-surface font-body-md text-body-md px-4 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-container"
      />
      <button aria-label="Send" onClick={() => send()} disabled={busy || !text.trim()} className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md active:scale-95 transition-transform disabled:opacity-40">
        <span className="material-symbols-outlined text-[22px]">send</span>
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-space-sm">
      {chat.length === 0 && (
        <div className="flex flex-wrap gap-space-xs">
          {STARTERS.map((q) => (
            <button key={q} onClick={() => send(q)} disabled={busy} className="px-3 py-1.5 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-label-md active:scale-95 transition-transform text-left">{q}</button>
          ))}
        </div>
      )}
      {chat.map((m, i) => (
        <div key={i} className={m.role === 'user'
          ? 'ml-auto max-w-[85%] bg-primary text-on-primary px-3.5 py-2 rounded-xl rounded-br-sm font-body-md text-body-md whitespace-pre-wrap'
          : 'mr-auto max-w-[92%] bg-surface-container-low text-on-surface px-3.5 py-2 rounded-xl rounded-bl-sm font-body-md text-body-md whitespace-pre-wrap shadow-sm'}>
          {m.role === 'user' ? m.content : plain(m.content)}
        </div>
      ))}
      {busy && (
        <div className="mr-auto bg-surface-container-low text-on-surface-variant px-3.5 py-2 rounded-xl rounded-bl-sm font-body-md text-body-md flex items-center gap-1.5 animate-pulse">
          <span className="material-symbols-outlined text-[16px]">psychology</span>Looking at the photo again…
        </div>
      )}
      {error && <p className="font-body-sm text-body-sm text-error font-semibold" role="alert">{error}</p>}
      <p className="font-label-sm text-label-sm text-on-surface-variant">AI answers can be wrong. Never eat or handle plants based on this.</p>
      {chat.length > 0 && !busy && (
        <button onClick={clear} className="self-start font-label-md text-label-md text-on-surface-variant hover:text-primary flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">delete_sweep</span>Clear conversation
        </button>
      )}
      <div ref={end} />
      {sticky ? (
        <div className="fixed left-0 right-0 z-40 px-margin pt-2 pb-2 bg-surface/90 backdrop-blur-xl" style={{ bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}>{input}</div>
      ) : input}
    </div>
  );
}

export default function Chat({ id: startId, go }) {
  const [list, setList] = useState(null);
  const [id, setId] = useState(startId);

  useEffect(() => {
    (async () => {
      const l = await api.sightings().catch(() => []);
      let items = l;
      if (startId && !l.some((x) => x._id === startId)) {
        try { items = [await api.sighting(startId), ...l]; } catch { /* ignore */ }
      }
      setList(items);
      setId(startId || items[0]?._id || null);
    })();
  }, []); // eslint-disable-line

  if (!list) return <p className="px-margin py-space-lg font-body-md text-body-md text-on-surface-variant">Loading…</p>;
  if (!list.length) {
    return (
      <div className="px-margin pt-space-lg flex flex-col items-center text-center gap-2">
        <span className="material-symbols-outlined text-[40px] text-secondary">forum</span>
        <h2 className="font-headline-sm text-headline-sm text-primary">Nothing to ask about yet</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">Photograph a plant and save it, then come back to ask follow-up questions.</p>
        <button onClick={() => go('find')} className="mt-1 px-5 h-11 rounded-full bg-primary text-on-primary font-label-md text-label-md font-semibold">Find a plant</button>
      </div>
    );
  }
  const cur = list.find((x) => x._id === id) || list[0];

  return (
    <div className="flex flex-col w-full px-margin pt-space-sm pb-28 gap-space-md">
      <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-sm">
        <div className="flex items-center gap-space-sm">
          <img src={cur.thumbPath} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
          <div className="min-w-0">
            <h2 className="font-title-md text-title-md text-primary truncate">{cur.commonName}</h2>
            <p className="font-body-sm text-body-sm italic text-on-surface-variant truncate">{cur.scientificName}</p>
            <span className="inline-flex items-center gap-0.5 bg-primary-fixed text-on-primary-fixed-variant px-1.5 py-0.5 rounded text-[10px] font-semibold mt-1">
              <span className="material-symbols-outlined text-[12px]">check_circle</span>{pct(cur.confidence)}% AI Match
            </span>
          </div>
        </div>
        <label className="block">
          <span className="font-label-sm text-label-sm text-on-surface-variant">Discussing</span>
          <select value={cur._id} onChange={(e) => setId(e.target.value)} className="w-full h-11 mt-0.5 bg-surface-container rounded-lg px-3 font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container">
            {list.map((x) => <option key={x._id} value={x._id}>{x.commonName} ({ago(x.takenAt)})</option>)}
          </select>
        </label>
      </div>
      <ChatThread id={cur._id} sticky />
    </div>
  );
}