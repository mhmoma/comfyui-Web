import { json, corsPreflight, checkNewsEditor, simpleMdToHtml } from './_shared.js';

export async function onRequestOptions() {
  return corsPreflight();
}

/** 资讯编辑预览：主/次级密钥均可 */
export async function onRequestPost(context) {
  const { request, env } = context;
  if (!(await checkNewsEditor(request, env))) {
    return json(403, { error: 'Forbidden' });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  const content = String(body.content || '');
  if (content.length > 48000) {
    return json(400, { error: '内容过长（最多 48000 字）' });
  }

  return json(200, {
    ok: true,
    html: simpleMdToHtml(content),
  });
}
