/**
 * 角色搜索：不再查 D1（LIKE 全表会打满额度）。
 * 前端应走「作品」栏 / 静态 chars；保留端点避免旧客户端 404。
 */
export async function onRequestGet() {
  return new Response(JSON.stringify([]), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=60",
      "X-Chars-Source": "disabled",
    },
  });
}
