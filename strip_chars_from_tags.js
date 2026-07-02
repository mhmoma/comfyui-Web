const fs = require('fs');
const path = require('path');

const TAGS_FILE = path.join(__dirname, 'tags.json');

const tags = JSON.parse(fs.readFileSync(TAGS_FILE, 'utf8'));

const charGroup = tags.find(g => g.name === '人物');
if (charGroup) {
  const before = charGroup.subgroups.length;
  let charCount = 0;
  charGroup.subgroups.forEach(s => { if (s && s.name !== '对象' && s.name !== '属性') charCount += (s.tags || []).length; });
  charGroup.subgroups = charGroup.subgroups.filter(s => s && (s.name === '对象' || s.name === '属性'));
  const after = charGroup.subgroups.length;
  console.log(`Stripped character subgroups: ${before} → ${after} (removed ${charCount} character tags)`);
}

fs.writeFileSync(TAGS_FILE, JSON.stringify(tags, null, 2), 'utf8');
const sizeKB = (fs.statSync(TAGS_FILE).size / 1024).toFixed(1);
console.log(`Updated tags.json: ${sizeKB} KB`);
