#!/usr/bin/env node
/**
 * 一次性生成 artists-meta.json（全表 COUNT，仅在 D1 额度充足时跑）。
 * 用法（在 comfyui-web 根目录）:
 *   $env:CLOUDFLARE_API_TOKEN = ...  # comfyui_web_api_key
 *   $env:CLOUDFLARE_ACCOUNT_ID = ... # comfyui_web_id
 *   node scripts/build-artists-meta.js
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');
const OUT = path.join(ROOT, 'artists-meta.json');
const DB = 'sucai';

function runSql(sql) {
  const res = spawnSync(
    'npx',
    ['wrangler', 'd1', 'execute', DB, '--remote', '--json', '--command', sql],
    { cwd: ROOT, encoding: 'utf8', shell: true }
  );
  if (res.status !== 0) {
    throw new Error(res.stderr || res.stdout || 'wrangler d1 execute failed');
  }
  const parsed = JSON.parse(res.stdout);
  const row = parsed?.[0]?.results?.[0];
  return row;
}

function countWhere(where = '') {
  const row = runSql(`SELECT COUNT(*) AS n FROM artists${where}`);
  return Number(row?.n) || 0;
}

function main() {
  console.log('统计 artists 并写入 artists-meta.json …');
  const letters = {};
  for (const ch of 'abcdefghijklmnopqrstuvwxyz') {
    letters[ch] = countWhere(` WHERE LOWER(SUBSTR(name, 1, 1)) = '${ch}'`);
    console.log(`  ${ch}: ${letters[ch]}`);
  }
  letters.other = countWhere(" WHERE LOWER(SUBSTR(name, 1, 1)) NOT BETWEEN 'a' AND 'z'");
  const total = countWhere();

  const payload = {
    v: 1,
    total,
    letters,
    updated: new Date().toISOString().slice(0, 10),
  };

  fs.writeFileSync(OUT, JSON.stringify(payload));
  fs.mkdirSync(DEPLOY, { recursive: true });
  fs.copyFileSync(OUT, path.join(DEPLOY, 'artists-meta.json'));
  console.log(`完成: total=${total}, 已写入 ${OUT} 与 deploy/artists-meta.json`);
  console.log('可选：把 total 写入 D1 app_meta → POST /api/artists/seed?action=rebuild-meta（需 ADMIN_KEY）');
}

main();
