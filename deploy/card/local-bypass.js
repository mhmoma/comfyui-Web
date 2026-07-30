/**
 * 旁路：始终保持会话，不进入登录页。
 * 清除全部数据时可通过 window.__allowClearAll 临时放开。
 */
(function () {
  const TOKEN = "local-dev-token";
  const NICK = "创作者";
  const USER = {
    id: "local-user",
    username: "creator",
    email: "creator@local",
    nickname: NICK,
    avatar: "",
    created_at: "2026-07-30 00:00:00",
  };

  function ensureSession() {
    try {
      localStorage.setItem("st_auth_token", TOKEN);
      localStorage.setItem("st_local_bypass", "1");
      localStorage.setItem("st_auth_user_cache", JSON.stringify(USER));
      if (!localStorage.getItem("st_user_custom_name")) {
        localStorage.setItem("st_user_custom_name", NICK);
      }
    } catch (e) {}
  }

  ensureSession();

  const _remove = localStorage.removeItem.bind(localStorage);
  localStorage.removeItem = function (key) {
    if (!window.__allowClearAll && (key === "st_auth_token" || key === "st_local_bypass")) {
      return;
    }
    return _remove(key);
  };

  // 非清档时，防止误清会话
  setInterval(function () {
    if (!window.__allowClearAll) ensureSession();
  }, 2000);
})();
