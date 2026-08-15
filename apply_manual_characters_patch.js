/**
 * Apply manual_characters_patch.json into characters.json + series_char_counts
 * and print SQL for D1 upsert.
 */
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const CHAR_FILE = path.join(ROOT, "characters.json");
const COUNT_FILE = path.join(ROOT, "series_char_counts.json");
const PATCH_FILE = path.join(ROOT, "manual_characters_patch.json");
const SQL_FILE = path.join(ROOT, "manual_characters_patch.sql");

function esc(s) {
  return String(s ?? "").replace(/'/g, "''");
}

const patches = JSON.parse(fs.readFileSync(PATCH_FILE, "utf8"));
const data = JSON.parse(fs.readFileSync(CHAR_FILE, "utf8"));
const counts = JSON.parse(fs.readFileSync(COUNT_FILE, "utf8"));
const sql = [];

let added = 0;
for (const patch of patches) {
  let series = data.find((s) => s.id === patch.series_id);
  if (!series) {
    series = {
      id: patch.series_id,
      name: patch.series_name || patch.series_id,
      count: 0,
      heat: 0,
      characters: [],
    };
    data.push(series);
  }
  const existing = new Set(
    series.characters.map((c) => String(c.t || "").toLowerCase())
  );
  for (const ch of patch.characters || []) {
    const key = String(ch.t || "").toLowerCase();
    if (!key || existing.has(key)) {
      console.log("skip existing:", ch.t);
      continue;
    }
    const row = {
      t: ch.t,
      n: ch.n,
      th: ch.th || "",
      c: ch.c || 0,
      ...(ch.lora ? { lora: ch.lora } : {}),
      ...(ch.tags?.length ? { tags: ch.tags } : {}),
    };
    series.characters.push(row);
    existing.add(key);
    added += 1;
    console.log("add:", ch.n, "|", ch.t);

    // D1: delete same trigger then insert (idempotent)
    sql.push(
      `DELETE FROM characters WHERE series_id = '${esc(patch.series_id)}' AND trigger_text = '${esc(ch.t)}';`
    );
    sql.push(
      `INSERT INTO characters (series_id, trigger_text, name, thumb_url, count, lora_url, tags) VALUES ('${esc(patch.series_id)}', '${esc(ch.t)}', '${esc(ch.n)}', '${esc(ch.th || "")}', ${Number(ch.c) || 0}, '${esc(ch.lora || "")}', '${esc(ch.tags ? JSON.stringify(ch.tags) : "")}');`
    );
  }
  series.count = series.characters.length;
  series.characters.sort((a, b) => (b.c || 0) - (a.c || 0));
  counts[patch.series_id] = series.characters.length;
  sql.push(
    `UPDATE series SET count = ${series.characters.length} WHERE id = '${esc(patch.series_id)}';`
  );
}

fs.writeFileSync(CHAR_FILE, JSON.stringify(data), "utf8");
fs.writeFileSync(COUNT_FILE, JSON.stringify(counts), "utf8");
fs.writeFileSync(SQL_FILE, sql.join("\n") + "\n", "utf8");
console.log(`\nDone. +${added} chars. SQL -> ${SQL_FILE}`);
console.log(
  "wuthering_waves now:",
  counts.wuthering_waves,
  "file MB",
  (fs.statSync(CHAR_FILE).size / 1024 / 1024).toFixed(2)
);
