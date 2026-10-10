import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import sharp from 'sharp';
import exifr from 'exifr';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient, ObjectId } from 'mongodb';
import { ACHIEVEMENTS, computeStats } from './achievements.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const AI_URL = process.env.AI_URL || 'http://127.0.0.1:8000';
const UPLOADS = path.join(here, 'uploads');
const THUMBS = path.join(UPLOADS, 'thumbs');
await fs.mkdir(THUMBS, { recursive: true });

const client = new MongoClient(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017', { serverSelectionTimeoutMS: 5000 });
try {
  await client.connect();
} catch {
  console.error('Cannot reach MongoDB. Start mongod (or fix MONGO_URI in server/.env) and try again.');
  process.exit(1);
}
const db = client.db(process.env.DB_NAME || 'wander');
const sightings = db.collection('sightings');
const species = db.collection('species');
const unlocked = db.collection('achievements');
await species.createIndex({ key: 1 }, { unique: true });
await unlocked.createIndex({ key: 1 }, { unique: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS,
    filename: (_req, f, cb) => cb(null, `${Date.now()}${path.extname(f.originalname || '') || '.jpg'}`),
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, f, cb) => cb(null, f.mimetype.startsWith('image/')),
});

const num = (v) => (v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v));
const toId = (s) => (ObjectId.isValid(s) ? new ObjectId(s) : null);

async function evaluateAchievements() {
  const confirmed = await sightings.find({ confirmed: true }).toArray();
  const stats = computeStats(confirmed, await species.countDocuments());
  const have = new Set((await unlocked.find().toArray()).map((a) => a.key));
  const fresh = [];
  for (const a of ACHIEVEMENTS) {
    if (!have.has(a.key) && a.test(stats)) {
      await unlocked.insertOne({ key: a.key, unlockedAt: new Date() });
      fresh.push({ key: a.key, title: a.title, description: a.description });
    }
  }
  return fresh;
}

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS));

app.get('/api/health', async (_req, res) => {
  let ai = false;
  try { ai = (await fetch(`${AI_URL}/health`)).ok; } catch {}
  res.json({ ok: true, mongo: true, ai });
});

app.post('/api/identify', upload.single('image'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'Send an image file in the "image" field.' });
  let lat = num(req.body.lat), lng = num(req.body.lng);
  let locationSource = lat !== null && lng !== null ? 'gps' : null;
  let takenAt = new Date();
  try {
    const gps = await exifr.gps(file.path);
    if (!locationSource && gps?.latitude != null) { lat = gps.latitude; lng = gps.longitude; locationSource = 'exif'; }
    const ex = await exifr.parse(file.path, ['DateTimeOriginal']);
    if (ex?.DateTimeOriginal instanceof Date) takenAt = ex.DateTimeOriginal;
  } catch {}
  const thumbName = `${path.parse(file.filename).name}.jpg`;
  await sharp(file.path).rotate().resize(400, 400, { fit: 'cover' }).jpeg({ quality: 75 }).toFile(path.join(THUMBS, thumbName));

  const form = new FormData();
  form.append('image', new Blob([await fs.readFile(file.path)], { type: file.mimetype }), file.originalname || 'photo.jpg');
  const t0 = Date.now();
  let ai;
  try {
    const r = await fetch(`${AI_URL}/identify`, { method: 'POST', body: form });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || `AI service returned ${r.status}`);
    ai = await r.json();
  } catch (e) {
    return res.status(502).json({ error: `Identification failed: ${e.message}` });
  }
  const doc = {
    photoPath: `/uploads/${file.filename}`, thumbPath: `/uploads/thumbs/${thumbName}`,
    lat, lng, locationSource, takenAt,
    commonName: ai.commonName, scientificName: ai.scientificName, confidence: ai.confidence, isPlant: ai.isPlant,
    features: ai.features, lookAlikes: ai.lookAlikes, summary: ai.summary,
    model: ai.model, latencyMs: Date.now() - t0, aiLatencyMs: ai.latencyMs,
    confirmed: false, createdAt: new Date(),
  };
  const { insertedId } = await sightings.insertOne(doc);
  console.log(`identify ${doc.commonName} (${doc.latencyMs} ms, model ${doc.model})`);
  res.json({ ...doc, _id: insertedId });
});

app.patch('/api/sightings/:id/location', async (req, res) => {
  const id = toId(req.params.id), lat = num(req.body.lat), lng = num(req.body.lng);
  if (!id || lat === null || lng === null) return res.status(400).json({ error: 'Send numeric lat and lng.' });
  const r = await sightings.updateOne({ _id: id }, { $set: { lat, lng, locationSource: 'pin' } });
  r.matchedCount ? res.json({ ok: true }) : res.status(404).json({ error: 'Sighting not found.' });
});

app.patch('/api/sightings/:id/confirm', async (req, res) => {
  const id = toId(req.params.id);
  const s = id && (await sightings.findOne({ _id: id }));
  if (!s) return res.status(404).json({ error: 'Sighting not found.' });
  if (s.confirmed) return res.json({ sighting: s, newAchievements: [] });
  if (s.lat == null) return res.status(400).json({ error: 'Add a location before confirming.' });
  const scientificName = (req.body.scientificName ?? s.scientificName ?? '').trim();
  const commonName = (req.body.commonName ?? s.commonName ?? '').trim();
  if (!scientificName && !commonName) return res.status(400).json({ error: 'Enter a species name.' });
  const key = (scientificName || commonName).toLowerCase();
  await species.updateOne(
    { key },
    { $setOnInsert: { key, scientificName, commonName, firstSeenAt: s.takenAt, firstSightingId: s._id, firstThumb: s.thumbPath }, $inc: { count: 1 } },
    { upsert: true },
  );
  await sightings.updateOne({ _id: id }, { $set: { confirmed: true, scientificName, commonName, speciesKey: key } });
  res.json({ sighting: { ...s, confirmed: true, scientificName, commonName, speciesKey: key }, newAchievements: await evaluateAchievements() });
});

app.get('/api/sightings', async (req, res) => {
  const q = req.query.confirmed === '1' ? { confirmed: true } : {};
  res.json(await sightings.find(q).sort({ takenAt: -1 }).toArray());
});
app.get('/api/species', async (_req, res) => res.json(await species.find().sort({ firstSeenAt: -1 }).toArray()));
app.get('/api/achievements', async (_req, res) => {
  const got = new Map((await unlocked.find().toArray()).map((a) => [a.key, a.unlockedAt]));
  res.json(ACHIEVEMENTS.map(({ test, ...a }) => ({ ...a, unlockedAt: got.get(a.key) ?? null })));
});
app.get('/api/sightings/:id', async (req, res) => {
  const id = toId(req.params.id);
  const s = id && (await sightings.findOne({ _id: id }));
  s ? res.json(s) : res.status(404).json({ error: 'Sighting not found.' });
});

// Follow-up questions about one photo. The conversation is stored on the sighting.
app.post('/api/sightings/:id/chat', async (req, res) => {
  const id = toId(req.params.id);
  const s = id && (await sightings.findOne({ _id: id }));
  if (!s) return res.status(404).json({ error: 'Sighting not found.' });
  const message = String(req.body.message || '').trim().slice(0, 1000);
  if (!message) return res.status(400).json({ error: 'Type a question first.' });
  const history = (s.chat || []).slice(-10).map(({ role, content }) => ({ role, content }));
  let reply;
  try {
    const image = (await fs.readFile(path.join(UPLOADS, path.basename(s.photoPath)))).toString('base64');
    const r = await fetch(`${AI_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image,
        context: { commonName: s.commonName, scientificName: s.scientificName, confidence: s.confidence, summary: s.summary, features: s.features, lookAlikes: s.lookAlikes },
        messages: [...history, { role: 'user', content: message }],
      }),
    });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || `AI service returned ${r.status}`);
    reply = (await r.json()).reply;
  } catch (e) {
    return res.status(502).json({ error: `Chat failed: ${e.message}` });
  }
  const added = [{ role: 'user', content: message, at: new Date() }, { role: 'assistant', content: reply, at: new Date() }];
  await sightings.updateOne({ _id: id }, { $push: { chat: { $each: added } } });
  res.json({ reply, chat: [...(s.chat || []), ...added] });
});

app.delete('/api/sightings/:id/chat', async (req, res) => {
  const id = toId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Bad id.' });
  await sightings.updateOne({ _id: id }, { $unset: { chat: '' } });
  res.json({ ok: true });
});

const dist = path.join(here, '../frontend/dist');
app.use(express.static(dist));
app.get('*', (req, res, next) => (req.path.startsWith('/api') ? next() : res.sendFile(path.join(dist, 'index.html'), (e) => e && next())));
app.use((err, _req, res, _next) => res.status(500).json({ error: err.message }));

app.listen(PORT, '0.0.0.0', () => console.log(`Wander server on http://0.0.0.0:${PORT}`));
