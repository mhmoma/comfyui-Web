const fs = require('fs');
const path = require('path');

const API_BASE = 'https://animadex.net/api/characters/search';
const PAGE_SIZE = 36;
const DELAY_MS = 300;
const OUTPUT = path.join(__dirname, 'animadex_raw.json');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchPage(page) {
  const url = `${API_BASE}?page=${page}&limit=${PAGE_SIZE}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} on page ${page}`);
  return res.json();
}

async function main() {
  console.log('Fetching AnimaDex character data...');

  const firstPage = await fetchPage(1);
  const totalPages = firstPage.pages;
  const totalChars = firstPage.total;
  console.log(`Total: ${totalChars} characters, ${totalPages} pages`);

  const allResults = [...firstPage.results];
  console.log(`[1/${totalPages}] ${allResults.length} chars`);

  for (let p = 2; p <= totalPages; p++) {
    await sleep(DELAY_MS);
    try {
      const data = await fetchPage(p);
      allResults.push(...data.results);
      if (p % 50 === 0 || p === totalPages) {
        console.log(`[${p}/${totalPages}] ${allResults.length} chars total`);
      }
    } catch (e) {
      console.error(`Page ${p} failed: ${e.message}, retrying...`);
      await sleep(2000);
      try {
        const data = await fetchPage(p);
        allResults.push(...data.results);
      } catch (e2) {
        console.error(`Page ${p} retry failed: ${e2.message}, skipping`);
      }
    }
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(allResults, null, 2), 'utf8');
  console.log(`\nSaved ${allResults.length} characters to ${OUTPUT}`);

  const copyrights = {};
  for (const c of allResults) {
    const cp = c.copyright || 'unknown';
    copyrights[cp] = (copyrights[cp] || 0) + 1;
  }
  const sorted = Object.entries(copyrights).sort((a, b) => b[1] - a[1]);
  console.log(`\nTop 20 series:`);
  sorted.slice(0, 20).forEach(([k, v]) => console.log(`  ${k}: ${v} chars`));
  console.log(`Total series: ${sorted.length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
