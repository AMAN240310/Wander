import { useEffect, useState } from 'react';
import { api } from './api.js';

export function Collection() {
  const [list, setList] = useState(null);
  useEffect(() => { api.species().then(setList).catch(() => setList([])); }, []);
  if (!list) return <p className="note">Loading…</p>;
  if (!list.length) return <p className="note">Your collection is empty. Confirm a sighting to add your first species.</p>;
  return (
    <section>
      <h2>{list.length} {list.length === 1 ? 'species' : 'species'} collected</h2>
      <ul className="grid">
        {list.map((s) => (
          <li key={s._id} className="card small">
            <img src={s.firstThumb} alt="" />
            <strong>{s.commonName || s.scientificName}</strong>
            <em>{s.scientificName}</em>
            <span className="meta">Seen {s.count}× · first {new Date(s.firstSeenAt).toLocaleDateString()}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Achievements() {
  const [list, setList] = useState(null);
  useEffect(() => { api.achievements().then(setList).catch(() => setList([])); }, []);
  if (!list) return <p className="note">Loading…</p>;
  return (
    <section>
      <h2>{list.filter((a) => a.unlockedAt).length} of {list.length} unlocked</h2>
      <ul className="grid">
        {list.map((a) => (
          <li key={a.key} className={`card small badge ${a.unlockedAt ? 'got' : ''}`}>
            <strong>{a.title}</strong>
            <span>{a.description}</span>
            <span className="meta">{a.unlockedAt ? `Unlocked ${new Date(a.unlockedAt).toLocaleDateString()}` : 'Locked'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
