const parse = async (r) => {
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || `Request failed (${r.status})`);
  return d;
};
const send = (url, method, body) =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(parse);

export const api = {
  health: () => fetch('/api/health').then(parse),
  identify(file, pos) {
    const f = new FormData();
    f.append('image', file);
    if (pos) { f.append('lat', pos.lat); f.append('lng', pos.lng); }
    return fetch('/api/identify', { method: 'POST', body: f }).then(parse);
  },
  setLocation: (id, lat, lng) => send(`/api/sightings/${id}/location`, 'PATCH', { lat, lng }),
  confirm: (id, names) => send(`/api/sightings/${id}/confirm`, 'PATCH', names),
  sightings: () => fetch('/api/sightings?confirmed=1').then(parse),
  species: () => fetch('/api/species').then(parse),
  achievements: () => fetch('/api/achievements').then(parse),
};
