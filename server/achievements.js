// Achievements are plain rules over confirmed sightings. No AI involved.
const R = 6371000;
function dist([a, b], [c, d]) {
  const rad = (x) => (x * Math.PI) / 180;
  const h = Math.sin(rad(c - a) / 2) ** 2 + Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(rad(d - b) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export function countPlaces(points, radius = 200) {
  const centers = [];
  for (const p of points) if (!centers.some((c) => dist(c, p) <= radius)) centers.push(p);
  return centers.length;
}
export function computeStats(confirmed, speciesCount) {
  const places = countPlaces(confirmed.filter((s) => s.lat != null).map((s) => [s.lat, s.lng]));
  const days = {};
  for (const s of confirmed) (days[new Date(s.takenAt).toDateString()] ??= new Set()).add(s.speciesKey);
  return {
    total: confirmed.length,
    species: speciesCount,
    places,
    maxPerDay: Math.max(0, ...Object.values(days).map((x) => x.size)),
    early: confirmed.some((s) => new Date(s.takenAt).getHours() < 7),
  };
}
export const ACHIEVEMENTS = [
  { key: 'first', title: 'First find', description: 'Confirm your first sighting', test: (s) => s.total >= 1 },
  { key: 'species5', title: 'Five species', description: 'Collect 5 different species', test: (s) => s.species >= 5 },
  { key: 'species10', title: 'Ten species', description: 'Collect 10 different species', test: (s) => s.species >= 10 },
  { key: 'species25', title: 'Twenty-five species', description: 'Collect 25 different species', test: (s) => s.species >= 25 },
  { key: 'places3', title: 'Three places', description: 'Find plants in 3 places at least 200 m apart', test: (s) => s.places >= 3 },
  { key: 'day3', title: 'Busy day', description: '3 different species in one day', test: (s) => s.maxPerDay >= 3 },
  { key: 'early', title: 'Early bird', description: 'A sighting before 7 AM', test: (s) => s.early },
];
