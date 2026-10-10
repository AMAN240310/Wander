"""Local plant-identification service. Wraps Ollama (Gemma vision) and returns validated JSON."""
import base64, io, json, os, re, time

import httpx
from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image, ImageOps
from pydantic import BaseModel, Field, ValidationError

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
MODEL = os.getenv("OLLAMA_MODEL","gemma4:e2b-it-qat")
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

CHAT_SYSTEM = """You are a careful, friendly botany guide inside a plant-collecting app. The user is asking follow-up
questions about ONE photo, which is attached to the first user message.
The app's earlier identification was: {ctx}
That identification may be wrong. If the user challenges it, look at the photo again, compare the visible features
(petal count, leaf shape, flower shape, arrangement) and say honestly whether you now agree, disagree or are unsure.
Keep answers short (under 120 words), plain text, no headings. Reply in the language the user writes in.
Never say or imply that a plant is edible, medicinal or safe to touch. If asked about safety, say a photo cannot
confirm it and suggest a local expert, a field guide or poison control. Do not invent facts about the photo."""


UNSAFE = re.compile(r"edible|\beat\b|eaten|medicin|safe to|poison", re.I)


class Result(BaseModel):
    commonName: str = "Unknown"
    scientificName: str = ""
    confidence: float = Field(0.0, ge=0, le=1)
    isPlant: bool = True
    features: list[str] = []
    lookAlikes: list[str] = []
    summary: str = ""

class ChatIn(BaseModel):
    image: str | None = None  # base64 of the original photo
    context: dict = {}
    messages: list[dict]

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


async def ollama_chat(body: dict) -> str:
    try:
        async with httpx.AsyncClient(timeout=300) as c:
            r = await c.post(f"{OLLAMA_URL}/api/chat", json=body)
            if r.status_code == 400 and "think" in body:  # model rejected the think flag: retry without it
                body = {k: v for k, v in body.items() if k != "think"}
                r = await c.post(f"{OLLAMA_URL}/api/chat", json=body)
    except httpx.ConnectError:
        raise HTTPException(503, "Ollama is not running. Start it, then retry.")
    if r.status_code == 404:
        raise HTTPException(503, f"Model '{MODEL}' not found. Run `ollama pull {MODEL}` or fix OLLAMA_MODEL.")
    if r.status_code >= 400:
        raise HTTPException(502, f"Ollama error: {r.text[:200]}")
    return r.json()["message"]["content"]


async def ask_model(b64: str) -> str:
    return await ollama_chat({"model": MODEL, "stream": False, "format": "json", "options": {"temperature": 0.2},
                              "messages": [{"role": "user", "content": PROMPT, "images": [b64]}]})

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

@app.post("/chat")
async def chat(body: ChatIn):
    ctx = json.dumps({k: v for k, v in body.context.items() if v not in (None, "", [])}, ensure_ascii=False)
    msgs = [{"role": "system", "content": CHAT_SYSTEM.format(ctx=ctx)}]
    for m in body.messages[-12:]:
        if m.get("role") in ("user", "assistant") and isinstance(m.get("content"), str):
            msgs.append({"role": m["role"], "content": m["content"][:2000]})
    first_user = next((m for m in msgs if m["role"] == "user"), None)
    if body.image and first_user is not None:
        first_user["images"] = [prepare(base64.b64decode(body.image))]
    t0 = time.time()
    reply = await ollama_chat({"model": MODEL, "stream": False, "think": False,
                               "options": {"temperature": 0.4, "num_predict": 400}, "messages": msgs})
    return {"reply": reply.strip(), "model": MODEL, "latencyMs": int((time.time() - t0) * 1000)}