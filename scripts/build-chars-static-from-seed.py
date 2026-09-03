#!/usr/bin/env python3
"""Build per-series static char JSON from seed.sql (+ optional characters.json tags)."""
import json
import re
import urllib.parse
from collections import defaultdict
from pathlib import Path

ROOT = Path(r"D:\桌宠\comfyui-web")
SEED = ROOT / "seed.sql"
CHARS_JSON = ROOT / "characters.json"
OUT = ROOT / "chars"


def split_sql_strings(s: str):
    """Parse comma-separated SQL string/number literals into Python values."""
    vals = []
    i = 0
    n = len(s)
    while i < n:
        while i < n and s[i] in " \t\r\n,":
            i += 1
        if i >= n:
            break
        if s[i] == "'":
            i += 1
            buf = []
            while i < n:
                if s[i] == "'":
                    if i + 1 < n and s[i + 1] == "'":
                        buf.append("'")
                        i += 2
                        continue
                    i += 1
                    break
                buf.append(s[i])
                i += 1
            vals.append("".join(buf))
        else:
            j = i
            while j < n and s[j] not in ",":
                j += 1
            raw = s[i:j].strip()
            if raw.upper() == "NULL":
                vals.append(None)
            else:
                try:
                    vals.append(int(raw))
                except ValueError:
                    try:
                        vals.append(float(raw))
                    except ValueError:
                        vals.append(raw)
            i = j
    return vals


def parse_seed_characters(text: str):
    # Match each VALUES (...) tuple after INSERT INTO characters
    # Use a regex for tuples starting with ('series'
    pattern = re.compile(
        r"\('((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*(-?\d+|NULL),\s*'((?:[^']|'')*)'\)",
        re.S,
    )
    rows = []
    for m in pattern.finditer(text):
        series_id = m.group(1).replace("''", "'")
        trigger = m.group(2).replace("''", "'")
        name = m.group(3).replace("''", "'")
        thumb = m.group(4).replace("''", "'")
        count_raw = m.group(5)
        count = 0 if count_raw == "NULL" else int(count_raw)
        lora = m.group(6).replace("''", "'")
        rows.append((series_id, trigger, name, thumb, count, lora))
    return rows


def load_tags_map():
    """Map (series_id, trigger) -> tags from characters.json if present."""
    if not CHARS_JSON.exists():
        return {}
    data = json.loads(CHARS_JSON.read_text(encoding="utf-8"))
    mp = {}
    for series in data:
        sid = series.get("id")
        for c in series.get("characters") or []:
            t = c.get("t")
            tags = c.get("tags")
            if sid and t and tags:
                mp[(sid, t)] = tags
    return mp


def main():
    text = SEED.read_text(encoding="utf-8", errors="replace")
    rows = parse_seed_characters(text)
    print("parsed seed rows", len(rows))
    tags_map = load_tags_map()
    print("tags overlay", len(tags_map))

    by = defaultdict(list)
    for series_id, trigger, name, thumb, count, lora in rows:
        item = {"t": trigger, "d": name, "_c": count}
        if thumb:
            item["th"] = thumb
        if lora:
            item["lora"] = lora
        tags = tags_map.get((series_id, trigger))
        if tags:
            item["tags"] = tags
        by[series_id].append(item)

    for sid, items in by.items():
        items.sort(key=lambda x: (-int(x.get("_c") or 0), str(x.get("d") or "").lower()))
        for it in items:
            it.pop("_c", None)

    OUT.mkdir(exist_ok=True)
    for p in OUT.glob("*.json"):
        p.unlink()

    index = {}
    for sid, items in by.items():
        fname = urllib.parse.quote(sid, safe="") + ".json"
        (OUT / fname).write_text(
            json.dumps(items, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        index[sid] = fname

    (OUT / "_index.json").write_text(
        json.dumps(
            {
                "v": 1,
                "n": len(index),
                "chars": sum(len(v) for v in by.values()),
                "files": index,
                "updated": "2026-09-03",
                "source": "seed.sql",
            },
            ensure_ascii=False,
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )
    size = sum(p.stat().st_size for p in OUT.glob("*.json"))
    print("series", len(index), "chars", sum(len(v) for v in by.values()), "bytes", size)
    # coverage vs series-list
    sl = json.loads((ROOT / "series-list-20260811.json").read_text(encoding="utf-8"))
    ids = {x["id"] for x in sl}
    missing = sorted(ids - set(index))
    extra = sorted(set(index) - ids)
    print("series-list", len(ids), "missing in chars", len(missing), "extra", len(extra))
    if missing[:5]:
        print("missing sample", missing[:5])


if __name__ == "__main__":
    main()
