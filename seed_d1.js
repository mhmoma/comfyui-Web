const fs = require('fs');
const path = require('path');

const CHARS_FILE = path.join(__dirname, 'characters.json');
const OUTPUT_FILE = path.join(__dirname, 'seed.sql');

function escapeSql(str) {
  if (!str) return '';
  return str.replace(/'/g, "''");
}

function main() {
  const data = JSON.parse(fs.readFileSync(CHARS_FILE, 'utf8'));
  const lines = [];

  lines.push('-- Auto-generated seed data');
  lines.push('DELETE FROM characters;');
  lines.push('DELETE FROM series;');
  lines.push('');

  let totalChars = 0;

  for (const s of data) {
    lines.push(`INSERT INTO series (id, name, count) VALUES ('${escapeSql(s.id)}', '${escapeSql(s.name)}', ${s.count || 0});`);
  }

  lines.push('');

  const BATCH_SIZE = 50;
  let batch = [];

  for (const s of data) {
    for (const ch of s.characters) {
      batch.push(`('${escapeSql(s.id)}', '${escapeSql(ch.t)}', '${escapeSql(ch.n)}', '${escapeSql(ch.th)}', ${ch.c || 0}, '${escapeSql(ch.lora || '')}')`);
      totalChars++;

      if (batch.length >= BATCH_SIZE) {
        lines.push(`INSERT INTO characters (series_id, trigger_text, name, thumb_url, count, lora_url) VALUES`);
        lines.push(batch.join(',\n') + ';');
        lines.push('');
        batch = [];
      }
    }
  }

  if (batch.length > 0) {
    lines.push(`INSERT INTO characters (series_id, trigger_text, name, thumb_url, count, lora_url) VALUES`);
    lines.push(batch.join(',\n') + ';');
  }

  fs.writeFileSync(OUTPUT_FILE, lines.join('\n'), 'utf8');
  const sizeKB = (fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1);
  console.log(`Generated seed.sql: ${data.length} series, ${totalChars} characters, ${sizeKB} KB`);
  console.log(`\nTo apply:`);
  console.log(`  1. npx wrangler d1 execute comfyui-characters --remote --file=schema.sql`);
  console.log(`  2. npx wrangler d1 execute comfyui-characters --remote --file=seed.sql`);
}

main();
