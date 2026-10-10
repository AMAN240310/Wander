export const FILL = { fontVariationSettings: "'FILL' 1" };
export const SOURCE = { gps: 'Phone GPS', exif: 'Photo location', pin: 'Pinned by you' };
export const pct = (c) => Math.round((c || 0) * 100);
export const shortDate = (d) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
export const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function ago(d) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 172800) return 'Yesterday';
  return shortDate(d);
}

const dist = ([a, b], [c, d]) => {
  const r = (x) => (x * Math.PI) / 180;
  const h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
};
export function countPlaces(points, radius = 200) {
  const centers = [];
  for (const p of points) if (!centers.some((c) => dist(c, p) <= radius)) centers.push(p);
  return centers.length;
}
export function computeStats(sightings, speciesCount) {
  const days = {};
  for (const s of sightings) (days[new Date(s.takenAt).toDateString()] ??= new Set()).add(s.speciesKey);
  return {
    finds: sightings.length,
    species: speciesCount,
    places: countPlaces(sightings.filter((s) => s.lat != null).map((s) => [s.lat, s.lng])),
    maxPerDay: Math.max(0, ...Object.values(days).map((x) => x.size)),
  };
}
export const MILESTONES = [1, 5, 10, 25];

export const BADGES = {
  first: { icon: 'eco', tier: 'Bronze', cat: 'collection', target: 1, stat: 'finds', hint: 'Confirm your first sighting' },
  species5: { icon: 'filter_vintage', tier: 'Silver', cat: 'collection', target: 5, stat: 'species' },
  species10: { icon: 'local_florist', tier: 'Emerald', cat: 'collection', target: 10, stat: 'species' },
  species25: { icon: 'forest', tier: 'Gold', cat: 'collection', target: 25, stat: 'species' },
  places3: { icon: 'explore', tier: 'Emerald', cat: 'field', target: 3, stat: 'places' },
  day3: { icon: 'wb_sunny', tier: 'Silver', cat: 'field', target: 3, stat: 'maxPerDay' },
  early: { icon: 'wb_twilight', tier: 'Bronze', cat: 'field', target: 1, stat: null, hint: 'Log a sighting before 7 AM' },
};
export const TIER = {
  Gold: { ring: 'bg-gradient-to-br from-tertiary-fixed via-tertiary-fixed-dim to-on-tertiary-container', inner: 'bg-tertiary-container', icon: 'text-tertiary-fixed', tag: 'bg-tertiary text-on-tertiary' },
  Emerald: { ring: 'bg-gradient-to-br from-primary-fixed via-primary-container to-primary', inner: 'bg-primary-container', icon: 'text-primary-fixed', tag: 'bg-primary text-on-primary' },
  Silver: { ring: 'bg-gradient-to-br from-outline-variant via-surface-variant to-outline', inner: 'bg-surface-container-high', icon: 'text-secondary', tag: 'bg-surface-dim text-on-surface' },
  Bronze: { ring: 'bg-gradient-to-br from-tertiary-fixed via-outline to-tertiary-container', inner: 'bg-tertiary-fixed', icon: 'text-on-tertiary-fixed', tag: 'bg-tertiary-fixed-dim text-on-tertiary-fixed' },
};
