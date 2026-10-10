import { useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import { computeStats, MILESTONES, pct, shortDate, SOURCE } from './lib.js';

const SORTS = [['recent', 'Recently Found'], ['name', 'Name A to Z'], ['seen', 'Most Found']];

export default function Collection({ go }) {
  const [species, setSpecies] = useState(null);
  const [sightings, setSightings] = useState([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState(0);
  const [grid, setGrid] = useState(false);
  const [open, setOpen] = useState({});

  useEffect(() => {
    Promise.all([api.species(), api.sightings()])
      .then(([sp, ss]) => { setSpecies(sp); setSightings(ss); })
      .catch(() => setSpecies([]));
  }, []);

  const cards = useMemo(() => {
    const byFirst = [...(species || [])].sort((a, b) => new Date(a.firstSeenAt) - new Date(b.firstSeenAt));
    return byFirst.map((sp, i) => {
      const ss = sightings.filter((s) => s.speciesKey === sp.key).sort((a, b) => new Date(a.takenAt) - new Date(b.takenAt));
      return { sp, ss, first: ss[0], latest: ss[ss.length - 1], no: i + 1 };
    });
  }, [species, sightings]);

  if (!species) return <p className="px-margin py-space-lg font-body-md text-body-md text-on-surface-variant">Loading…</p>;

  const stats = computeStats(sightings, species.length);
  const next = MILESTONES.find((m) => m > stats.species);
  const repeats = cards.filter((c) => c.sp.count > 1).length;

  const q = query.toLowerCase().trim();
  const list = cards
    .filter((c) => (filter === 'repeat' ? c.sp.count > 1 : true))
    .filter((c) => !q || `${c.sp.commonName} ${c.sp.scientificName}`.toLowerCase().includes(q))
    .sort((a, b) =>
      SORTS[sort][0] === 'name' ? (a.sp.commonName || '').localeCompare(b.sp.commonName || '')
      : SORTS[sort][0] === 'seen' ? b.sp.count - a.sp.count
      : new Date(b.sp.firstSeenAt) - new Date(a.sp.firstSeenAt));

  return (
    <div className="flex flex-col w-full pb-8">
      {/* Summary */}
      <div className="px-margin pt-4 pb-2">
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm">
          <div className="flex flex-col mb-3">
            <div className="flex items-center gap-1.5 text-primary">
              <span className="material-symbols-outlined text-[18px]">menu_book</span>
              <span className="font-label-md text-label-md tracking-wider uppercase text-on-surface-variant">Personal Herbarium</span>
            </div>
            <h1 className="font-headline-sm text-headline-sm text-primary font-bold mt-0.5">Field Log &amp; Catalog</h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1 mt-0.5">
              <span className="material-symbols-outlined text-[14px] text-secondary">explore</span>
              {stats.finds} {stats.finds === 1 ? 'find' : 'finds'} across {stats.places} {stats.places === 1 ? 'place' : 'places'}
            </p>
          </div>
          <div className="bg-surface-container-low rounded-lg p-3 my-2">
            <div className="flex items-center justify-between font-label-md text-label-md mb-1.5">
              <span className="text-on-surface-variant font-medium">{next ? 'Progress to your next badge' : 'All species badges unlocked'}</span>
              {next && <span className="text-primary-container font-semibold">{stats.species} / {next}</span>}
            </div>
            <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
              <div className="bg-primary-container h-full rounded-full transition-all duration-500" style={{ width: next ? `${(stats.species / next) * 100}%` : '100%' }}></div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="bg-surface-container-low rounded-lg py-2 px-1">
              <span className="font-headline-sm text-headline-sm text-primary block leading-none">{stats.species}</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant block mt-1 truncate">Species</span>
            </div>
            <div className="bg-surface-container-low rounded-lg py-2 px-1">
              <span className="font-headline-sm text-headline-sm text-primary-container block leading-none">{stats.finds}</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant block mt-1 truncate">Finds</span>
            </div>
            <div className="bg-tertiary-fixed rounded-lg py-2 px-1">
              <span className="font-headline-sm text-headline-sm text-on-tertiary-fixed block leading-none">{stats.places}</span>
              <span className="font-label-sm text-label-sm text-on-tertiary-fixed-variant block mt-1 truncate">Places</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search and controls */}
      <div className="px-margin pt-2 pb-1 space-y-2.5">
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-3.5 text-secondary text-[20px] pointer-events-none">search</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="w-full h-11 pl-10 pr-4 bg-surface-container-lowest rounded-lg font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant/70 shadow-sm focus:outline-none" placeholder={`Search ${species.length} species by common or scientific name...`} type="text" />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 -mx-margin px-margin">
          {[['all', `All Finds (${species.length})`, 'eco'], ['repeat', `Found Again (${repeats})`, 'repeat']].map(([k, label, icon]) => (
            <button key={k} onClick={() => setFilter(k)} className={`whitespace-nowrap px-3.5 py-1.5 rounded-full font-label-md text-label-md shadow-sm flex items-center gap-1 active:scale-95 transition-transform ${filter === k ? 'bg-primary-container text-on-primary' : 'bg-surface-container-lowest text-on-surface-variant hover:text-on-surface'}`}>
              <span className="material-symbols-outlined text-[15px]">{icon}</span>{label}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Sorted by:</span>
            <button onClick={() => setSort((sort + 1) % SORTS.length)} className="flex items-center gap-1 font-label-md text-label-md text-primary font-semibold py-1 px-2 rounded hover:bg-surface-container-low transition-colors">
              <span>{SORTS[sort][1]}</span>
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </button>
          </div>
          <div className="flex items-center bg-surface-container-low p-0.5 rounded-lg shadow-sm">
            <button aria-label="Detailed cards" onClick={() => setGrid(false)} className={`w-8 h-7 rounded flex items-center justify-center transition-colors ${!grid ? 'bg-surface-container-lowest text-primary shadow-xs' : 'text-on-surface-variant hover:text-primary'}`}>
              <span className="material-symbols-outlined text-[18px]">view_agenda</span>
            </button>
            <button aria-label="Compact grid" onClick={() => setGrid(true)} className={`w-8 h-7 rounded flex items-center justify-center transition-colors ${grid ? 'bg-surface-container-lowest text-primary shadow-xs' : 'text-on-surface-variant hover:text-primary'}`}>
              <span className="material-symbols-outlined text-[18px]">grid_view</span>
            </button>
          </div>
        </div>
      </div>

      {/* Specimen cards */}
      <div className={`px-margin pt-2 ${grid ? 'grid grid-cols-2 gap-2.5' : 'space-y-3.5'}`}>
        {list.map(({ sp, ss, first, latest, no }) => (
          <article key={sp._id} className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm transition-all duration-200">
            <div className="relative w-full aspect-[16/10] bg-surface-container overflow-hidden">
              <img alt={sp.commonName} className="w-full h-full object-cover" src={first?.thumbPath || sp.firstThumb} />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/75 via-transparent to-black/20 pointer-events-none"></div>
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                <span className="bg-primary/85 backdrop-blur-md text-on-primary font-label-sm text-label-sm font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                  <span className="material-symbols-outlined text-[13px] text-primary-fixed">verified</span> {pct(latest?.confidence)}% Match
                </span>
                {sp.count > 1 && !grid && (
                  <span className="bg-secondary-container/90 backdrop-blur-md text-on-secondary-container font-label-sm text-label-sm font-medium px-2 py-0.5 rounded-full">Found {sp.count} times</span>
                )}
              </div>
              <div className="absolute bottom-2.5 left-3 right-3 text-on-primary">
                <span className="font-label-sm text-label-sm text-primary-fixed tracking-wide uppercase font-semibold">Field ID #{String(no).padStart(3, '0')}</span>
                <h2 className={`font-headline-sm font-bold leading-tight drop-shadow-sm ${grid ? 'text-label-lg' : 'text-headline-sm'}`}>{sp.commonName || sp.scientificName}</h2>
              </div>
            </div>
            {!grid && (
              <div className="p-space-md space-y-2.5">
                <p className="font-serif italic font-medium text-primary pb-1">{sp.scientificName}</p>
                {latest?.summary && <p className="font-body-sm text-body-sm text-on-surface leading-relaxed bg-surface-container-low p-2.5 rounded-lg">{latest.summary}</p>}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5 text-on-surface-variant font-label-sm text-label-sm">
                    <span className="material-symbols-outlined text-[15px] text-primary">history_edu</span>
                    <span>First found {shortDate(sp.firstSeenAt)}</span>
                  </div>
                  <button onClick={() => setOpen({ ...open, [sp._id]: !open[sp._id] })} className="text-primary-container font-label-md text-label-md font-semibold flex items-center gap-0.5 hover:underline">
                    Specimen Sheet <span className="material-symbols-outlined text-[16px]">{open[sp._id] ? 'expand_more' : 'chevron_right'}</span>
                  </button>
                </div>
                {open[sp._id] && (
                  <div className="bg-surface-container-low rounded-lg p-3 space-y-2 font-body-sm text-body-sm text-on-surface-variant">
                    {latest?.features?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {latest.features.map((f) => <span key={f} className="bg-secondary-container text-on-secondary-container font-label-sm text-label-sm px-2 py-0.5 rounded-full">{f}</span>)}
                      </div>
                    )}
                    {latest?.lookAlikes?.length > 0 && <p><span className="font-semibold text-on-surface">Could be confused with:</span> {latest.lookAlikes.join(', ')}</p>}
                    <p className="font-semibold text-on-surface">Sightings</p>
                    <ul className="space-y-1">
                      {ss.map((s) => (
                        <li key={s._id} className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px] text-secondary">pin_drop</span>
                          {shortDate(s.takenAt)}, {s.lat != null ? `${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}` : 'no location'} ({SOURCE[s.locationSource] || 'saved'})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </article>
        ))}
      </div>

      {list.length === 0 && (
        <p className="px-margin pt-space-md font-body-md text-body-md text-on-surface-variant text-center">
          {species.length === 0 ? 'Your collection is empty. Save a sighting and your first species is catalogued here.' : 'No species match your search.'}
        </p>
      )}

      {/* Log new */}
      <div className="px-margin pt-4">
        <div className="bg-surface-container-low rounded-xl p-space-md flex items-center gap-3 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-surface-container-lowest flex items-center justify-center text-primary shadow-xs">
            <span className="material-symbols-outlined text-[26px]">add_a_photo</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-title-md text-title-md text-primary font-bold">Log New Specimen</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant truncate">Found a plant you don't know yet?</p>
          </div>
          <button onClick={() => go('find')} className="px-4 py-2 bg-primary text-on-primary rounded-full font-label-md text-label-md font-semibold shadow-sm active:scale-95 transition-transform whitespace-nowrap">Scan Now</button>
        </div>
      </div>
    </div>
  );
}
