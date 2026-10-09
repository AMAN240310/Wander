"""Local plant-identification service. Wraps Ollama (Gemma vision) and returns validated JSON."""
import base64, io, json, os, re, time

import httpx
from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image, ImageOps
from pydantic import BaseModel, Field, ValidationError

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
MODEL = os.getenv("OLLAMA_MODEL", "gemma4:e2b")
MAX_SIDE = int(os.getenv("MAX_IMAGE_SIDE", "896"))

PROMPT = """You are a careful field botanist's assistant. Look at the photo and identify the plant or flower.
Reply with ONLY one JSON object, no markdown, using exactly these keys:
{"commonName": string, "scientificName": string, "confidence": number between 0 and 1,
 "isPlant": boolean, "features": [up to 4 visible features such as petal count, leaf shape, colour],
 "lookAlikes": [up to 3 similar species it could be confused with],
 "summary": "two plain sentences about what it is and where it is usually found"}
Rules: be honest about uncertainty and lower the confidence when the photo is unclear. If the photo does not
show a plant, set isPlant to false and explain briefly in summary. Never say or imply that anything is
edible, medicinal, poisonous or safe to touch."""

UNSAFE = re.compile(r"edible|\beat\b|eaten|medicin|safe to|poison", re.I)


class Result(BaseModel):
    commonName: str = "Unknown"
    scientificName: str = ""
    confidence: float = Field(0.0, ge=0, le=1)
    isPlant: bool = True
    features: list[str] = []
    lookAlikes: list[str] = []
    summary: str = ""


def prepare(data: bytes) -> str:
    img = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
    img.thumbnail((MAX_SIDE, MAX_SIDE))
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=88)
    return base64.b64encode(buf.getvalue()).decode()


def parse(text: str) -> Result:
    text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.M).strip()
    raw = json.loads(text[text.index("{"): text.rindex("}") + 1])
    c = float(raw.get("confidence", 0) or 0)
    raw["confidence"] = min(1.0, c / 100 if c > 1 else c)
    res = Result(**raw)
    res.summary = " ".join(s for s in re.split(r"(?<=[.!?])\s+", res.summary) if not UNSAFE.search(s))
    return res


async def ask_model(b64: str) -> str:
    body = {"model": MODEL, "stream": False, "format": "json", "options": {"temperature": 0.2},
            "messages": [{"role": "user", "content": PROMPT, "images": [b64]}]}
    try:
        async with httpx.AsyncClient(timeout=300) as c:
            r = await c.post(f"{OLLAMA_URL}/api/chat", json=body)
    except httpx.ConnectError:
        raise HTTPException(503, "Ollama is not running. Start it, then retry.")
    if r.status_code == 404:
        raise HTTPException(503, f"Model '{MODEL}' not found. Run `ollama pull {MODEL}` or fix OLLAMA_MODEL.")
    if r.status_code >= 400:
        raise HTTPException(502, f"Ollama error: {r.text[:200]}")
    return r.json()["message"]["content"]


async def run_model(data: bytes) -> dict:
    b64, last = prepare(data), None
    t0 = time.time()
    for _ in range(2):  # one automatic retry on invalid JSON
        try:
            out = parse(await ask_model(b64)).model_dump()
            return {**out, "model": MODEL, "latencyMs": int((time.time() - t0) * 1000)}
        except (ValueError, ValidationError, KeyError) as e:
            last = e
    raise HTTPException(502, f"Model returned invalid JSON twice: {last}")


app = FastAPI(title="Wander AI service")


@app.get("/health")
async def health():
    return {"ok": True, "model": MODEL}


@app.post("/identify")
async def identify(image: UploadFile = File(...)):
    return await run_model(await image.read())
