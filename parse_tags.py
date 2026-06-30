import urllib.request
import re
import json

urls = [
    'https://raw.githubusercontent.com/weilin9999/WeiLin-Comfyui-Tools-Prompt/master/tags/2025_03_31/tags_2025_03_31.sql',
    'https://raw.githubusercontent.com/weilin9999/WeiLin-Comfyui-Tools-Prompt/master/tags/2025_04_01/weilin_NSFW%E8%AF%8D%E5%BA%93_2025_04_01_001.sql',
]

all_sql = ''
for url in urls:
    try:
        data = urllib.request.urlopen(url, timeout=30).read().decode('utf-8')
        all_sql += data + '\n'
        print(f'Downloaded: {len(data)} chars')
    except Exception as e:
        print(f'Failed: {url} - {e}')

groups = {}
subgroups = {}
tags = []

# Parse tag_groups - format: VALUES (id_index, 'name', 'color', create_time, 'p_uuid')
for m in re.finditer(
    r'INSERT OR REPLACE INTO "tag_groups"[^V]+VALUES\s*\((\d+),\s*\'([^\']*)\',\s*\'([^\']*)\',\s*\d+,\s*\'([^\']*)\'\)',
    all_sql
):
    idx, name, color, p_uuid = m.groups()
    groups[p_uuid] = {'name': name, 'color': color, 'index': int(idx)}

# Parse tag_subgroups - two formats:
# Main: VALUES (id_index, group_id, 'name', 'color', create_time, 'g_uuid', 'p_uuid')
for m in re.finditer(
    r'INSERT OR REPLACE INTO "tag_subgroups"[^V]+VALUES\s*\(\d+,\s*\d+,\s*\'([^\']*)\',\s*\'([^\']*)\',\s*\d+,\s*\'([^\']*)\',\s*\'([^\']*)\'\)',
    all_sql
):
    name, color, g_uuid, p_uuid = m.groups()
    subgroups[g_uuid] = {'name': name, 'p_uuid': p_uuid}

# NSFW: VALUES ('name', 'color', create_time, 'p_uuid', 'g_uuid')
for m in re.finditer(
    r'INSERT OR REPLACE INTO "tag_subgroups"[^V]+VALUES\s*\(\'([^\']*)\',\s*\'([^\']*)\',\s*\d+,\s*\'([^\']*)\',\s*\'([^\']*)\'\)',
    all_sql
):
    name, color, p_uuid, g_uuid = m.groups()
    if g_uuid not in subgroups:
        subgroups[g_uuid] = {'name': name, 'p_uuid': p_uuid}

# Parse tag_tags - two formats:
# Main: VALUES (id_index, subgroup_id, 'text', 'desc', 'color', create_time, 't_uuid', 'g_uuid')
for m in re.finditer(
    r'INSERT OR REPLACE INTO "tag_tags"[^V]+VALUES\s*\(\d+,\s*\d+,\s*\'([^\']*)\',\s*\'([^\']*)\',\s*\'[^\']*\',\s*\d+,\s*\'[^\']*\',\s*\'([^\']*)\'\)',
    all_sql
):
    text, desc, g_uuid = m.groups()
    tags.append({'text': text, 'desc': desc, 'g_uuid': g_uuid})

# NSFW: VALUES ('text', 'desc', 'color', create_time, 'g_uuid', 't_uuid')
for m in re.finditer(
    r'INSERT OR REPLACE INTO "tag_tags"[^V]+VALUES\s*\(\'([^\']*)\',\s*\'([^\']*)\',\s*\'[^\']*\',\s*\d+,\s*\'([^\']*)\',\s*\'[^\']*\'\)',
    all_sql
):
    text, desc, g_uuid = m.groups()
    tags.append({'text': text, 'desc': desc, 'g_uuid': g_uuid})

print(f'Groups: {len(groups)}, Subgroups: {len(subgroups)}, Tags: {len(tags)}')

# Deduplicate tags
seen = set()
unique_tags = []
for t in tags:
    key = (t['text'], t['g_uuid'])
    if key not in seen:
        seen.add(key)
        unique_tags.append(t)
tags = unique_tags
print(f'After dedup: {len(tags)} tags')

# Build structured JSON
result = []
for p_uuid, grp in sorted(groups.items(), key=lambda x: x[1]['index']):
    group_data = {'name': grp['name'], 'subgroups': []}
    for g_uuid, sub in subgroups.items():
        if sub['p_uuid'] == p_uuid:
            sub_tags = [{'t': t['text'], 'd': t['desc']} for t in tags if t['g_uuid'] == g_uuid]
            if sub_tags:
                group_data['subgroups'].append({'name': sub['name'], 'tags': sub_tags})
    if group_data['subgroups']:
        result.append(group_data)

with open('tags.json', 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, separators=(',', ':'))

print(f'\nOutput: {len(result)} groups')
for g in result:
    total = sum(len(s['tags']) for s in g['subgroups'])
    print(f'  {g["name"]}: {len(g["subgroups"])} subgroups, {total} tags')

import os
size_kb = os.path.getsize('tags.json') / 1024
print(f'\nFile size: {size_kb:.0f} KB')
