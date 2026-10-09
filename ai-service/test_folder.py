"""Run the model over a folder of photos and print JSON: python test_folder.py ./photos"""
import asyncio, json, pathlib, sys
from main import run_model

async def go(folder):
    for p in sorted(pathlib.Path(folder).iterdir()):
        if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}:
            r = await run_model(p.read_bytes())
            print(json.dumps({"file": p.name, **r}, ensure_ascii=False))

asyncio.run(go(sys.argv[1] if len(sys.argv) > 1 else "."))
