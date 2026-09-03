#!/usr/bin/env python3
"""Export D1 characters into deployable per-series static JSON files."""
import json
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

ROOT = Path(r"D:\桌宠\comfyui-web")
ENV_PATH = Path(r"d:\云端本地开发\.env")
DB = "3ea1156e-cbaa-40ec-b85c-4b55be6ecc58"
PAGE = 2500


def load_env():
    env = {}
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def main():
    env = load_env()
    token = env["comfyui_web_api_key"]
    acct = env["comfyui_web_id"]
    url = f"https://api.cloudflare.com/client/v4/accounts/{acct}/d1/database/{DB}/query"

    def q(sql):
        req = urllib.request.Request(
            url,
            data=json.dumps({"sql": sql}).encode(),
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )
        with urllib.request.urlopen(req, timeout=180) as r:
            data = json.loads(r.read().decode())
        if not data.get("success"):
            raise SystemExit(json.dumps(data, ensure_ascii=False))
        return data["result"][0]

    all_rows = []
    offset = 0
    while True:
        sql = (
            "SELECT series_id, trigger_text AS t, name AS d, thumb_url AS th, "
            "lora_url AS lora, tags, count FROM characters "
            f"ORDER BY series_id, count DESC LIMIT {PAGE} OFFSET {offset}"
        )
        res = q(sql)
        rows = res.get("results") or []
        meta = res.get("meta") or {}
        print(
            f"offset={offset} got={len(rows)} rows_read={meta.get('rows_read')}",
            flush=True,
        )
        all_rows.extend(rows)
        if len(rows) < PAGE:
            break
        offset += PAGE

    print("total rows", len(all_rows), flush=True)

    by = defaultdict(list)
    for r in all_rows:
        sid = r["series_id"]
        item = {"t": r["t"], "d": r["d"]}
        if r.get("th"):
            item["th"] = r["th"]
        if r.get("lora"):
            item["lora"] = r["lora"]
        tags = r.get("tags")
        if tags:
            if isinstance(tags, str) and tags.strip():
                try:
                    item["tags"] = json.loads(tags)
                except Exception:
                    pass
            elif isinstance(tags, list):
                item["tags"] = tags
        by[sid].append(item)

    out = ROOT / "chars"
    out.mkdir(exist_ok=True)
    for p in out.glob("*.json"):
        p.unlink()

    index = {}
    for sid, items in by.items():
        fname = urllib.parse.quote(sid, safe="") + ".json"
        (out / fname).write_text(
            json.dumps(items, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        index[sid] = fname

    (out / "_index.json").write_text(
        json.dumps(
            {"v": 1, "n": len(index), "files": index, "updated": "2026-09-03"},
            ensure_ascii=False,
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )
    size = sum(p.stat().st_size for p in out.glob("*.json"))
    print("series files", len(index), "bytes", size, flush=True)


if __name__ == "__main__":
    main()
