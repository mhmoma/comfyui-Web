const CATALOG_JSON = "/artists-by-score.json";

let catalogMem = null;
let catalogInflight = null;

/** 边缘内存 + CF 缓存：整表画师目录（按 score DESC 预排序）。 */
export async function loadArtistsCatalog(request) {
  if (Array.isArray(catalogMem) && catalogMem.length) return catalogMem;
  if (catalogInflight) return catalogInflight;

  catalogInflight = (async () => {
    const url = new URL(CATALOG_JSON, request.url);
    const res = await fetch(url.toString(), {
      cf: { cacheEverything: true, cacheTtl: 86400 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) return null;
    catalogMem = data;
    return data;
  })().finally(() => {
    catalogInflight = null;
  });

  return catalogInflight;
}

export function filterCatalog(rows, { letter, q, blocked }) {
  let out = rows;
  if (letter && letter !== "all") {
    if (letter === "other") {
      out = out.filter((r) => {
        const ch = String(r.name || "").trim().charAt(0).toLowerCase();
        return ch < "a" || ch > "z";
      });
    } else if (/^[a-z]$/.test(letter)) {
      out = out.filter((r) => String(r.name || "").trim().charAt(0).toLowerCase() === letter);
    }
  }
  if (q) {
    const needle = q.toLowerCase();
    out = out.filter((r) => {
      const name = String(r.name || "").toLowerCase();
      const trigger = String(r.trigger_text || "").toLowerCase();
      const slug = String(r.slug || "").toLowerCase();
      return name.includes(needle) || trigger.includes(needle) || slug.includes(needle);
    });
  }
  if (blocked && blocked.length) {
    const set = new Set(blocked.map((s) => String(s).toLowerCase()));
    out = out.filter((r) => !set.has(String(r.slug || "").toLowerCase()));
  }
  return out;
}

export function sortCatalog(rows, sortCol, sortDir) {
  const dir = sortDir === "ASC" ? 1 : -1;
  const key = sortCol === "name" ? "name" : sortCol === "count" ? "count" : "score";
  // 预排序文件已是 score DESC；同序直接复用
  if (key === "score" && dir === -1) return rows;

  const copy = rows.slice();
  copy.sort((a, b) => {
    if (key === "name") {
      const an = String(a.name || "").toLowerCase();
      const bn = String(b.name || "").toLowerCase();
      if (an < bn) return -1 * dir;
      if (an > bn) return 1 * dir;
      return 0;
    }
    const av = Number(a[key]) || 0;
    const bv = Number(b[key]) || 0;
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" });
  });
  return copy;
}
