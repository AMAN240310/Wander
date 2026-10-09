import { useState } from 'react';
import Capture from './Capture.jsx';
import MapView from './MapView.jsx';
import { Collection, Achievements } from './Lists.jsx';

const TABS = [['capture', 'Find'], ['map', 'Map'], ['collection', 'Collection'], ['achievements', 'Badges']];

export default function App() {
  const [tab, setTab] = useState('capture');
  const [toast, setToast] = useState(null);
  const announce = (list) => {
    if (!list?.length) return;
    setToast(list.map((a) => a.title).join(', '));
    setTimeout(() => setToast(null), 4500);
  };
  return (
    <div className="app">
      <header><h1>Wander</h1><p>Find it, photograph it, keep it.</p></header>
      <main>
        {tab === 'capture' && <Capture onUnlock={announce} />}
        {tab === 'map' && <MapView />}
        {tab === 'collection' && <Collection />}
        {tab === 'achievements' && <Achievements />}
      </main>
      {toast && <div className="toast" role="status">Unlocked: {toast}</div>}
      <nav>
        {TABS.map(([k, label]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>
        ))}
      </nav>
    </div>
  );
}
