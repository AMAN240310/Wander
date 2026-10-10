import { useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import { BADGES, TIER, computeStats, shortDate, ago, FILL } from './lib.js';

const RANKS = [['Seedling', 0], ['Sprout', 1], ['Forager', 3], ['Field Naturalist', 5], ['Master Botanist', 7]];
const CATS = [['all', 'All Badges', 'all_inclusive'], ['collection', 'Collection', 'filter_vintage'], ['field', 'Field Work', 'flag']];

export default function Badges() {
  const [badges, setBadges] = useState(null);
  const [sightings, setSightings] = useState([]);
  const [speciesCount, setSpeciesCount] = useState(0);
  const [cat, setCat] = useState('all');
  const [modal, setModal] = useState(null);

  useEffect(() => {
    Promise.all([api.achievements(), api.sightings(), api.species()])
      .then(([a, s, sp]) => { setBadges(a); setSightings(s); setSpeciesCount(sp.length); })
      .catch(() => setBadges([]));
  }, []);

  const stats = useMemo(() => ({
    ...computeStats(sightings, speciesCount),
    early: sightings.some((s) => new Date(s.takenAt).getHours() < 7) ? 1 : 0,
  }), [sightings, speciesCount]);

  if (!badges) return <p className="px-margin py-space-lg font-body-md text-body-md text-on-surface-variant">Loading…</p>;

  const meta = (b) => BADGES[b.key] || { icon: 'workspace_premium', tier: 'Bronze', cat: 'collection' };
  const inCat = (b) => cat === 'all' || meta(b).cat === cat;
  const earned = badges.filter((b) => b.unlockedAt).sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt));
  const locked = badges.filter((b) => !b.unlockedAt);
  const rankIdx = RANKS.reduce((acc, [, min], i) => (earned.length >= min ? i : acc), 0);
  const nextRank = RANKS[rankIdx + 1];
  const latest = earned[0];
  const pctDone = badges.length ? Math.round((earned.length / badges.length) * 100) : 0;

  return (
    <div className="flex flex-col w-full pb-10 pt-space-sm">
      {/* Recent unlock */}
      {latest && (
        <section className="px-margin mb-space-md">
          <div onClick={() => setModal(latest)} className="relative overflow-hidden bg-tertiary-fixed text-on-tertiary-fixed rounded-xl p-space-md shadow-md flex items-center justify-between gap-space-sm cursor-pointer transition-transform active:scale-[0.98]">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-tertiary/10 rounded-full blur-xl pointer-events-none"></div>
            <div className="flex items-center gap-space-md min-w-0 z-10">
              <div className="relative w-12 h-12 rounded-full bg-surface flex items-center justify-center shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-tertiary text-[26px]" style={FILL}>emoji_events</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-space-xs">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-tertiary-fixed-variant">New Milestone</span>
                  <span className="text-on-tertiary-fixed-variant text-[11px]">• {ago(latest.unlockedAt)}</span>
                </div>
                <p className="font-title-md text-title-md text-on-tertiary-fixed truncate font-bold">{latest.title}</p>
                <p className="font-body-sm text-body-sm text-on-tertiary-fixed-variant truncate">{latest.description}</p>
              </div>
            </div>
            <span className="shrink-0 w-9 h-9 rounded-full bg-on-tertiary-fixed/10 flex items-center justify-center text-on-tertiary-fixed z-10">
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </span>
          </div>
        </section>
      )}

      {/* Rank hero */}
      <section className="px-margin mb-space-lg">
        <div className="bg-surface-container rounded-xl p-space-md shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-space-md mb-space-md">
            <div className="relative w-14 h-14 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-[32px] text-primary-fixed" style={FILL}>park</span>
              <span className="absolute -bottom-1 -right-1 bg-tertiary text-on-tertiary font-label-sm text-label-sm px-1.5 py-0.5 rounded-full font-bold shadow-sm">{earned.length}/{badges.length}</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">Naturalist Rank</span>
                <span className="material-symbols-outlined text-secondary text-[14px]">verified</span>
              </div>
              <h1 className="font-headline-sm text-headline-sm text-primary tracking-tight">{RANKS[rankIdx][0]}</h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant">{stats.species} {stats.species === 1 ? 'species' : 'species'} collected</p>
            </div>
          </div>
          <div className="bg-surface rounded-lg p-space-md mb-space-md shadow-sm">
            <div className="flex justify-between items-center mb-space-xs">
              <span className="font-label-md text-label-md text-on-surface font-semibold">Badge Codex Completion</span>
              <span className="font-label-md text-label-md text-primary font-bold">{earned.length} / {badges.length} <span className="text-on-surface-variant font-normal">({pctDone}%)</span></span>
            </div>
            <div className="w-full bg-surface-variant h-3 rounded-full overflow-hidden relative">
              <div className="bg-primary-container h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pctDone}%` }}></div>
            </div>
            <div className="flex justify-between items-center mt-1.5">
              <span className="font-body-sm text-body-sm text-on-surface-variant">Rank: {RANKS[rankIdx][0]}</span>
              <span className="font-body-sm text-body-sm text-secondary font-medium">{nextRank ? `${nextRank[1] - earned.length} more to ${nextRank[0]}` : 'Top rank reached'}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-space-sm">
            {[
              ['verified', 'bg-secondary-container text-on-secondary-container', 'text-primary', earned.length, 'Unlocked'],
              ['hourglass_top', 'bg-surface-variant text-on-surface-variant', 'text-on-surface', locked.length, 'In Progress'],
              ['filter_vintage', 'bg-tertiary-fixed text-on-tertiary-fixed', 'text-tertiary-container', stats.species, 'Species'],
              ['eco', 'bg-primary-fixed text-on-primary-fixed', 'text-primary', stats.finds, 'Finds'],
            ].map(([icon, chip, num, v, label]) => (
              <div key={label} className="bg-surface rounded-lg p-space-sm flex items-center gap-space-sm shadow-sm">
                <div className={`w-9 h-9 rounded-full ${chip} flex items-center justify-center shrink-0`}>
                  <span className="material-symbols-outlined text-[18px]">{icon}</span>
                </div>
                <div className="min-w-0">
                  <span className={`font-headline-sm text-headline-sm leading-tight font-bold ${num}`}>{v}</span>
                  <p className="font-label-sm text-label-sm text-on-surface-variant truncate">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mb-space-lg">
        <div className="px-margin mb-space-xs flex items-center justify-between">
          <h2 className="font-title-md text-title-md text-primary">Milestone Categories</h2>
          <span className="font-label-sm text-label-sm text-on-surface-variant">Tap to filter</span>
        </div>
        <div className="flex overflow-x-auto gap-space-xs px-margin no-scrollbar py-1">
          {CATS.map(([k, label, icon]) => (
            <button key={k} onClick={() => setCat(k)} className={`shrink-0 px-4 h-9 rounded-full font-label-md text-label-md flex items-center gap-1.5 active:scale-95 transition-transform ${cat === k ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-variant'}`}>
              <span className="material-symbols-outlined text-[16px]">{icon}</span>
              <span>{label} ({k === 'all' ? badges.length : badges.filter((b) => meta(b).cat === k).length})</span>
            </button>
          ))}
        </div>
      </section>

      {/* Earned */}
      <section className="px-margin mb-space-xl">
        <div className="flex items-center justify-between mb-space-sm">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary-container text-[20px]">military_tech</span>
            <h2 className="font-headline-sm text-headline-sm text-primary">Earned Emblems</h2>
          </div>
          <span className="font-label-md text-label-md text-secondary font-semibold">{earned.filter(inCat).length} Unlocked</span>
        </div>
        {earned.filter(inCat).length === 0 && (
          <p className="bg-surface-container rounded-xl p-space-md font-body-md text-body-md text-on-surface-variant">No badges here yet. Save a sighting to earn your first.</p>
        )}
        <div className="grid grid-cols-1 gap-space-md">
          {earned.filter(inCat).map((b) => {
            const m = meta(b), t = TIER[m.tier];
            return (
              <article key={b.key} onClick={() => setModal(b)} className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm relative overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer">
                <div className="flex items-start gap-space-md">
                  <div className={`relative w-16 h-16 rounded-full ${t.ring} p-0.5 shrink-0 shadow-md flex items-center justify-center`}>
                    <div className={`w-full h-full rounded-full ${t.inner} flex items-center justify-center relative overflow-hidden`}>
                      <span className={`material-symbols-outlined text-[34px] ${t.icon}`} style={FILL}>{m.icon}</span>
                    </div>
                    <span className={`absolute -bottom-1 -right-1 ${t.tag} text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider`}>{m.tier}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-space-xs">
                      <h3 className="font-title-md text-title-md text-primary font-bold truncate">{b.title}</h3>
                      <span className="font-label-sm text-label-sm text-on-surface-variant shrink-0">{shortDate(b.unlockedAt)}</span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{b.description}</p>
                    <div className="flex items-center gap-space-sm mt-space-sm">
                      <span className="inline-flex items-center gap-1 text-secondary font-label-sm text-label-sm">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span> Complete
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* In progress */}
      <section className="px-margin mb-space-xl">
        <div className="flex items-center justify-between mb-space-sm">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-secondary text-[20px]">pending_actions</span>
            <h2 className="font-headline-sm text-headline-sm text-primary">In Progress &amp; Quests</h2>
          </div>
          <span className="font-label-md text-label-md text-on-surface-variant font-medium">{locked.filter(inCat).length} Active</span>
        </div>
        {locked.filter(inCat).length === 0 && (
          <p className="bg-surface-container rounded-xl p-space-md font-body-md text-body-md text-on-surface-variant">Nothing left in this category. Nice work.</p>
        )}
        <div className="flex flex-col gap-space-md">
          {locked.filter(inCat).map((b) => {
            const m = meta(b);
            if (!m.stat) {
              return (
                <article key={b.key} className="bg-surface-container-high rounded-xl p-space-md shadow-sm relative overflow-hidden opacity-90">
                  <div className="flex items-start gap-space-md">
                    <div className="w-14 h-14 rounded-full bg-surface-dim flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[24px] text-outline">lock</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-title-md text-title-md text-on-surface-variant font-bold">{b.title}</h3>
                        <span className="font-label-sm text-label-sm text-outline uppercase font-semibold">Locked</span>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{b.description}</p>
                      <div className="mt-space-sm flex items-center gap-1 text-outline font-label-sm text-label-sm">
                        <span className="material-symbols-outlined text-[14px]">{m.icon}</span> {m.hint}
                      </div>
                    </div>
                  </div>
                </article>
              );
            }
            const have = Math.min(stats[m.stat] || 0, m.target);
            const p = Math.round((have / m.target) * 100);
            return (
              <article key={b.key} className="bg-surface-container rounded-xl p-space-md shadow-sm relative overflow-hidden">
                <div className="flex items-start gap-space-md">
                  <div className="w-14 h-14 rounded-full bg-surface-variant text-on-surface-variant flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[28px] text-secondary">{m.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-title-md text-title-md text-primary font-bold">{b.title}</h3>
                      <span className="font-label-sm text-label-sm text-secondary font-bold">{have} of {m.target}</span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{b.description}</p>
                    <div className="mt-space-sm">
                      <div className="w-full bg-surface-variant h-2 rounded-full overflow-hidden">
                        <div className="bg-secondary h-full rounded-full transition-all duration-500" style={{ width: `${p}%` }}></div>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="font-label-sm text-label-sm text-on-surface-variant">{m.target - have} more to go</span>
                        <span className="font-label-sm text-label-sm text-primary font-semibold">{p}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Detail sheet */}
      {modal && (
        <div onClick={() => setModal(null)} className="fixed inset-0 z-[60] bg-inverse-surface/60 backdrop-blur-sm flex items-end justify-center">
          <div onClick={(e) => e.stopPropagation()} className="w-full bg-surface-container-lowest rounded-t-2xl p-space-lg max-h-[85vh] overflow-y-auto shadow-2xl relative">
            <div className="w-12 h-1.5 bg-surface-variant rounded-full mx-auto mb-space-md"></div>
            <div className="flex justify-between items-start mb-space-md">
              <div className="flex items-center gap-space-md">
                <div className="w-14 h-14 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center shrink-0 shadow-md">
                  <span className="material-symbols-outlined text-[32px]">{meta(modal).icon}</span>
                </div>
                <div>
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-tertiary-container font-semibold">{meta(modal).tier} badge</span>
                  <h3 className="font-headline-sm text-headline-sm text-primary">{modal.title}</h3>
                </div>
              </div>
              <button aria-label="Close" onClick={() => setModal(null)} className="w-9 h-9 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant hover:bg-surface-dim">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mb-space-md">{modal.description}</p>
            <div className="bg-surface-container rounded-xl p-space-md mb-space-lg">
              <div className="flex items-center gap-space-sm text-on-surface-variant font-body-sm text-body-sm">
                <span className="material-symbols-outlined text-secondary text-[18px]">calendar_today</span>
                <span>Unlocked {new Date(modal.unlockedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
            </div>
            <button onClick={() => setModal(null)} className="w-full h-12 bg-surface-container text-primary font-label-md text-label-md font-semibold rounded-full hover:bg-surface-variant transition-colors">Dismiss</button>
          </div>
        </div>
      )}
    </div>
  );
}
