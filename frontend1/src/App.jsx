import { useState } from 'react';
import Find from './Capture.jsx';
import MapPage from './MapView.jsx';
import Collection from './Collection.jsx';
import Badges from './Badges.jsx';
import { FILL } from './lib.js';

const TABS = [
  ['find', 'Find', 'center_focus_strong'],
  ['map', 'Map', 'explore'],
  ['collection', 'Collection', 'filter_vintage'],
  ['badges', 'Badges', 'workspace_premium'],
];

export default function App() {
  const [tab, setTab] = useState('find');
  const [toast, setToast] = useState(null);
  const announce = (list) => {
    if (!list?.length) return;
    setToast(list.map((a) => a.title).join(', '));
    setTimeout(() => setToast(null), 5000);
  };
  return (
    <>
      <header className="fixed top-0 w-full z-50 pt-safe bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(27,67,50,0.05)]">
        <div className="h-16 px-margin flex items-center justify-between">
          <div className="flex flex-col justify-center select-none">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-[20px]">local_florist</span>
              <span className="font-headline-sm text-headline-sm text-primary tracking-tight leading-none">Wander</span>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant font-normal tracking-normal pt-0.5">Explore &amp; identify native flora</span>
          </div>
          <div className="flex items-center gap-space-sm">
            {toast && (
              <div role="status" className="flex items-center gap-space-xs bg-tertiary-fixed text-on-tertiary-fixed px-space-sm py-1 rounded-full shadow-[0_2px_10px_rgba(221,161,94,0.30)] transition-all animate-bounce">
                <span className="material-symbols-outlined text-[16px] text-tertiary-container">military_tech</span>
                <span className="font-label-sm text-label-sm truncate max-w-[140px]">{toast}</span>
                <button aria-label="Dismiss" className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-on-tertiary-fixed/10" onClick={() => setToast(null)}>
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </div>
            )}
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-col relative w-full pt-16 pb-24 bg-surface min-h-screen">
        {tab === 'find' && <Find onUnlock={announce} go={setTab} />}
        {tab === 'map' && <MapPage go={setTab} />}
        {tab === 'collection' && <Collection go={setTab} />}
        {tab === 'badges' && <Badges />}
      </main>

      <nav className="fixed bottom-0 w-full z-50 pb-safe bg-surface/90 backdrop-blur-xl shadow-[0_-2px_12px_rgba(27,67,50,0.06)]">
        <div className="flex items-center justify-around h-16 px-space-xs">
          {TABS.map(([key, label, icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              aria-current={tab === key ? 'page' : undefined}
              className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-space-xs transition-colors ${tab === key ? 'text-primary-container font-semibold' : 'text-on-surface-variant'}`}
            >
              <span className="material-symbols-outlined text-[24px]" style={tab === key ? FILL : undefined}>{icon}</span>
              <span className="font-label-sm text-label-sm mt-0.5">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
