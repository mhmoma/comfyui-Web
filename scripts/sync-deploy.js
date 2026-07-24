#!/usr/bin/env node
/**
 * 同步门户与工具文件到 deploy/
 * 用法: node scripts/sync-deploy.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
    console.log('  ✓', path.relative(ROOT, dest));
}

function copyDir(src, dest) {
    if (!fs.existsSync(src)) return;
    ensureDir(dest);
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const s = path.join(src, entry.name);
        const d = path.join(dest, entry.name);
        if (entry.isDirectory()) copyDir(s, d);
        else copyFile(s, d);
    }
}

function main() {
    console.log('同步到 deploy/…');

    const files = [
        ['index.html', 'index.html'],
        ['feed.xml', 'feed.xml'],
        ['sitemap.xml', 'sitemap.xml'],
        ['manifest.webmanifest', 'manifest.webmanifest'],
        ['sw.js', 'sw.js'],
    ];
    for (const [src, dest] of files) {
        const srcPath = path.join(ROOT, src);
        if (fs.existsSync(srcPath)) copyFile(srcPath, path.join(DEPLOY, dest));
    }

    copyDir(path.join(ROOT, 'assets'), path.join(DEPLOY, 'assets'));
    copyDir(path.join(ROOT, 'news'), path.join(DEPLOY, 'news'));
    copyDir(path.join(ROOT, 'guides'), path.join(DEPLOY, 'guides'));
    copyDir(path.join(ROOT, 'about'), path.join(DEPLOY, 'about'));
    copyDir(path.join(ROOT, 'admin'), path.join(DEPLOY, 'admin'));
    copyDir(path.join(ROOT, 'app'), path.join(DEPLOY, 'app'));

    console.log('\n完成');
}

main();
