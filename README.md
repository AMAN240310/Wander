# Wander

Photograph a plant, let a **local Gemma vision model** identify it, confirm the name, and watch your collection and map grow. Everything AI runs on your laptop through Ollama. No cloud AI.

```
phone browser ─► Express (:3000, serves React) ─► MongoDB (local)
                      └──► FastAPI (127.0.0.1:8000) ─► Ollama (Gemma vision)
```

## Setup (Windows, run each block in its own terminal)

**Prerequisites:** Node 18+, Python 3.10+, MongoDB Community running locally, Ollama.

```
ollama pull gemma4:e2b      # then run `ollama list` and use the EXACT tag you see
```

**1. AI service**
```
cd ai-service
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
set OLLAMA_MODEL=gemma4:e2b
uvicorn main:app --host 127.0.0.1 --port 8000
```

**2. Server**
```
cd server
copy .env.example .env
npm install
npm start
```

**3. Frontend (build once; Express serves it)**
```
cd frontend
npm install
npm run build
```

Open `http://localhost:3000`. On your phone, join the same Wi-Fi (or the phone's hotspot), find the laptop IP with `ipconfig`, and open `http://<laptop-ip>:3000`. Allow port 3000 in Windows Firewall if asked.
For live frontend editing use `npm run dev` in `frontend/` and open port 5173.

## Measure accuracy and speed
```
cd ai-service
python test_folder.py ..\my-photos
```
Prints one JSON line per photo including `latencyMs`. Every saved sighting also stores its latency.

## Notes and limits
- **Location:** phones only share GPS with pages on HTTPS. Over plain LAN HTTP the app reads GPS from the photo's EXIF data (turn on location tags in the camera), and otherwise asks you to tap the map.
- **Map tiles need internet.** Photo ID, saving and the collection work offline; the map background does not (no tile cache yet).
- **Not built yet:** place suggestions (Open-Meteo + Overpass), voice, offline tile cache.
- **Safety:** AI identifications can be wrong. The app never claims a plant is edible or safe.
- The default model tag `gemma4:e2b` is unverified; set `OLLAMA_MODEL` to what `ollama list` shows.

## Credits
Gemma (Google, open weights) via Ollama · MongoDB · Express · React · Vite · Leaflet · OpenStreetMap · sharp · exifr · FastAPI · Pillow.
