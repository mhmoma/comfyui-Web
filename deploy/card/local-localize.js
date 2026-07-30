/**
 * 轻量文案替换 + 主题氛围粒子层
 */
(function () {
  const BRAND = "角色卡生成";
  const exact = {
    "客服与公告": "公告",
    "公共群聊": "公告",
    "群聊室": "公告",
    "帮助与日志": "帮助与说明",
    "帮助与更新日志": "帮助与说明",
    "隐私与条款": "条款",
    "使用须知": "使用说明",
    "使用须知与免责声明": "使用说明",
    "隐私政策": "隐私说明",
    "服务条款": "服务说明",
    "退出登录": "退出",
    "注销账号": "清除数据",
    "清除本地数据": "清除数据",
    "ST Card Web": BRAND,
    "stcard.top": BRAND,
    "在线客服": "公告",
    "本机作者": "创作者",
    "本地作者": "创作者",
    "本地测试": "创作者",
  };
  const fuzzy = [
    [/stcard\.top/gi, BRAND],
    [/ST Card Web/g, BRAND],
  ];

  function patchTextNode(node) {
    const raw = node.nodeValue;
    if (!raw || !raw.trim()) return;
    let next = raw;
    const trimmed = next.trim();
    if (exact[trimmed] !== undefined) next = next.replace(trimmed, exact[trimmed]);
    else {
      for (const [k, v] of Object.entries(exact)) if (k && next.includes(k)) next = next.split(k).join(v);
      for (const [re, v] of fuzzy) next = next.replace(re, v);
    }
    if (next !== raw) node.nodeValue = next;
  }

  function walk(root) {
    if (!root) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    let n;
    while ((n = w.nextNode())) nodes.push(n);
    nodes.forEach(patchTextNode);
  }

  function tick() {
    walk(document.body);
  }

  const obs = new MutationObserver(() => {
    clearTimeout(tick._t);
    tick._t = setTimeout(tick, 120);
  });

  /* —— 主题动态特效层 —— */
  const FX_THEMES = {
    ocean: { className: "fx-bubble", count: 28, build(el, i) {
      const size = 8 + Math.random() * 22;
      el.style.width = size + "px";
      el.style.height = size + "px";
      el.style.left = Math.random() * 100 + "%";
      el.style.bottom = "-5%";
      el.style.animationDuration = 6 + Math.random() * 10 + "s";
      el.style.animationDelay = -Math.random() * 10 + "s";
      el.style.opacity = String(0.55 + Math.random() * 0.4);
    }},
    sunset: { className: "fx-ember", count: 32, build(el) {
      const size = 4 + Math.random() * 10;
      el.style.width = size + "px";
      el.style.height = size + "px";
      el.style.left = 5 + Math.random() * 90 + "%";
      el.style.bottom = "0";
      el.style.animationDuration = 4 + Math.random() * 8 + "s";
      el.style.animationDelay = -Math.random() * 8 + "s";
    }},
    forest: { className: "fx-leaf", count: 24, build(el) {
      el.style.left = Math.random() * 100 + "%";
      el.style.top = "-5%";
      el.style.animationDuration = 7 + Math.random() * 10 + "s";
      el.style.animationDelay = -Math.random() * 10 + "s";
      el.style.filter = "hue-rotate(" + (Math.random() * 40 - 10) + "deg) saturate(1.2)";
      el.style.opacity = "0.85";
    }},
    sakura: { className: "fx-petal", count: 36, build(el) {
      const s = 0.85 + Math.random() * 1.1;
      el.style.transform = "scale(" + s + ")";
      el.style.left = Math.random() * 100 + "%";
      el.style.top = "-8%";
      el.style.animationDuration = 5 + Math.random() * 8 + "s";
      el.style.animationDelay = -Math.random() * 8 + "s";
    }},
    cyberpunk: { className: "fx-neon", count: 9, build(el) {
      el.style.width = 25 + Math.random() * 50 + "vw";
      el.style.top = 5 + Math.random() * 85 + "%";
      el.style.left = "-30vw";
      el.style.animationDuration = 2.5 + Math.random() * 3.5 + "s";
      el.style.animationDelay = -Math.random() * 4 + "s";
    }},
  };

  let fxRoot = null;

  function ensureFxRoot() {
    if (fxRoot && document.body.contains(fxRoot)) return fxRoot;
    fxRoot = document.getElementById("theme-fx");
    if (!fxRoot) {
      fxRoot = document.createElement("div");
      fxRoot.id = "theme-fx";
      document.body.appendChild(fxRoot);
    }
    return fxRoot;
  }

  function clearFx() {
    if (fxRoot) fxRoot.innerHTML = "";
  }

  function applyThemeFx(theme) {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      clearFx();
      return;
    }
    const conf = FX_THEMES[theme];
    const root = ensureFxRoot();
    root.innerHTML = "";
    if (!conf) return;
    for (let i = 0; i < conf.count; i++) {
      const el = document.createElement("span");
      el.className = "fx-item " + conf.className;
      conf.build(el, i);
      root.appendChild(el);
    }
  }

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") || "dark";
  }

  function startThemeFx() {
    ensureFxRoot();
    applyThemeFx(currentTheme());
    const themeObs = new MutationObserver(() => applyThemeFx(currentTheme()));
    themeObs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
  }

  /* —— 右上角主题下拉菜单 —— */
  const THEME_OPTIONS = [
    { id: "dark", name: "暗黑", icon: "🌙", desc: "经典深色" },
    { id: "light", name: "明亮", icon: "☀️", desc: "清爽浅色" },
    { id: "ocean", name: "海洋", icon: "🌊", desc: "青蓝深色" },
    { id: "sunset", name: "夕阳", icon: "🌅", desc: "暖橙暮色" },
    { id: "forest", name: "森林", icon: "🌲", desc: "草木绿色" },
    { id: "sakura", name: "樱花", icon: "🌸", desc: "浅粉柔和" },
    { id: "cyberpunk", name: "赛博", icon: "⚡", desc: "霓虹赛博" },
  ];

  let themeMenuEl = null;
  let themeMenuOpen = false;

  function ensureThemeMenu() {
    if (themeMenuEl && document.body.contains(themeMenuEl)) return themeMenuEl;
    themeMenuEl = document.createElement("div");
    themeMenuEl.id = "theme-dropdown";
    themeMenuEl.className = "theme-dropdown";
    themeMenuEl.hidden = true;
    themeMenuEl.innerHTML =
      '<div class="theme-dropdown-title">选择主题</div>' +
      '<div class="theme-dropdown-list"></div>';
    document.body.appendChild(themeMenuEl);
    return themeMenuEl;
  }

  function renderThemeMenuList() {
    const menu = ensureThemeMenu();
    const list = menu.querySelector(".theme-dropdown-list");
    const cur = currentTheme();
    list.innerHTML = THEME_OPTIONS.map((t) => {
      const active = t.id === cur ? " is-active" : "";
      return (
        '<button type="button" class="theme-dropdown-item' +
        active +
        '" data-theme-id="' +
        t.id +
        '">' +
        '<span class="theme-dropdown-icon">' +
        t.icon +
        "</span>" +
        '<span class="theme-dropdown-text"><strong>' +
        t.name +
        "</strong><small>" +
        t.desc +
        "</small></span>" +
        (active ? '<span class="theme-dropdown-check">✓</span>' : "") +
        "</button>"
      );
    }).join("");
  }

  function positionThemeMenu(btn) {
    const menu = ensureThemeMenu();
    const trigger =
      btn ||
      document.querySelector(".theme-menu-trigger") ||
      document.querySelector('button[title^="切换主题"]');
    if (!trigger) {
      menu.style.top = "56px";
      menu.style.right = "16px";
      menu.style.left = "auto";
      return;
    }
    const r = trigger.getBoundingClientRect();
    const menuW = 220;
    let left = r.right - menuW;
    if (left < 8) left = 8;
    if (left + menuW > window.innerWidth - 8) left = window.innerWidth - menuW - 8;
    menu.style.left = left + "px";
    menu.style.right = "auto";
    menu.style.top = r.bottom + 8 + "px";
  }

  function closeThemeMenu() {
    themeMenuOpen = false;
    if (themeMenuEl) themeMenuEl.hidden = true;
  }

  function openThemeMenu(btn) {
    renderThemeMenuList();
    positionThemeMenu(btn);
    themeMenuOpen = true;
    ensureThemeMenu().hidden = false;
  }

  function applyThemeChoice(id) {
    if (typeof window.__applyTheme === "function") {
      window.__applyTheme(id);
    } else {
      document.documentElement.setAttribute("data-theme", id);
      localStorage.setItem("st_theme", JSON.stringify(id));
    }
    syncThemeTriggerIcon(id);
    closeThemeMenu();
  }

  function syncThemeTriggerIcon(id) {
    const theme = id || currentTheme();
    const opt = THEME_OPTIONS.find((t) => t.id === theme);
    const emoji = (opt && opt.icon) || (theme === "custom" ? "🖼️" : "🎨");
    const name = (opt && opt.name) || theme;
    document.querySelectorAll(".theme-menu-trigger").forEach((btn) => {
      let slot = btn.querySelector(".theme-menu-emoji");
      if (!slot) {
        const oldIcon = btn.querySelector("i.fa-solid, i.fa-moon, i.fa-sun");
        if (oldIcon) oldIcon.remove();
        slot = document.createElement("span");
        slot.className = "theme-menu-emoji text-sm leading-none";
        btn.appendChild(slot);
      }
      slot.textContent = emoji;
      btn.setAttribute("title", "切换主题（当前：" + name + "）");
    });
  }

  function startThemeMenu() {
    ensureThemeMenu();
    syncThemeTriggerIcon();

    window.addEventListener("st-open-theme-menu", (e) => {
      const btn = e.detail && e.detail.btn;
      if (themeMenuOpen) closeThemeMenu();
      else openThemeMenu(btn);
    });

    const themeIconObs = new MutationObserver(() => syncThemeTriggerIcon());
    themeIconObs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    document.addEventListener("click", (e) => {
      const item = e.target.closest && e.target.closest("[data-theme-id]");
      if (item && themeMenuEl && themeMenuEl.contains(item)) {
        e.preventDefault();
        e.stopPropagation();
        applyThemeChoice(item.getAttribute("data-theme-id"));
        return;
      }
      if (!themeMenuOpen) return;
      if (e.target.closest && e.target.closest(".theme-menu-trigger")) return;
      if (themeMenuEl && themeMenuEl.contains(e.target)) return;
      closeThemeMenu();
    }, true);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeThemeMenu();
    });

    window.addEventListener("resize", () => {
      if (themeMenuOpen) positionThemeMenu();
    });
  }


  function tagSpecialButtons(root) {
    const scope = root || document;
    const nodes = scope.querySelectorAll ? scope.querySelectorAll("button, .btn-primary, .btn-secondary") : [];
    nodes.forEach((btn) => {
      if (!(btn instanceof HTMLElement)) return;
      // 侧栏导航不要当成特殊高亮键
      if (btn.closest(".sidebar, aside, nav, .theme-dropdown, .card-home-back")) {
        btn.classList.remove("theme-special-btn", "theme-danger-btn");
        return;
      }
      const text = (btn.textContent || "").replace(/\s+/g, "");
      const isAi =
        btn.querySelector(".fa-wand-magic-sparkles, .fa-magic, .fa-robot") ||
        /^(?=.*(AI|生成|灵感|提取|构思|破限|诊断))(?!.*界面).*/.test(text) ||
        /(AI生成|AI构思|AI提取|生成灵感|开始生成|一键生成)/.test(text);
      const isDanger = /删除|清除|注销|危险|彻底/.test(text) || /rose|red-/.test(btn.className);
      btn.classList.toggle("theme-special-btn", !!isAi);
      btn.classList.toggle("theme-danger-btn", !!isDanger && !isAi);
    });
  }

  /* —— 返回门户主页：侧栏标题旁图标（仅 /card） —— */
  function buildHomeBackBtn() {
    const a = document.createElement("a");
    a.id = "card-home-back";
    a.className = "card-home-back";
    a.href = "/";
    a.title = "返回主页";
    a.setAttribute("aria-label", "返回主页");
    a.innerHTML = '<i class="fa-solid fa-house" aria-hidden="true"></i>';
    return a;
  }

  function findSidebarBrandMount() {
    const hide = document.querySelector(".sidebar-collapse-hide");
    if (hide && hide.parentElement) return { parent: hide.parentElement, after: hide };

    const img = document.querySelector('img[src*="jsksc-icon"]');
    if (img) {
      const row = img.parentElement && img.parentElement.parentElement;
      if (row) return { parent: row, after: img.parentElement };
    }

    const titles = document.querySelectorAll(".sidebar .text-sm.font-bold, aside .text-sm.font-bold");
    for (const el of titles) {
      if ((el.textContent || "").includes("角色卡") && el.parentElement) {
        return { parent: el.parentElement.parentElement || el.parentElement, after: el.parentElement };
      }
    }
    return null;
  }

  function ensureHomeBack() {
    if (!location.pathname.startsWith("/card")) return;
    const mount = findSidebarBrandMount();
    if (!mount) return;

    let btn = document.getElementById("card-home-back");
    if (!btn) btn = buildHomeBackBtn();

    // 挂到侧栏品牌行：标题块右侧
    if (btn.parentElement !== mount.parent || btn.previousElementSibling !== mount.after) {
      mount.after.insertAdjacentElement("afterend", btn);
    }
  }

  function start() {
    tick();
    tagSpecialButtons();
    obs.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    const tagObs = new MutationObserver(() => {
      clearTimeout(tagSpecialButtons._t);
      tagSpecialButtons._t = setTimeout(() => {
        tagSpecialButtons();
        ensureHomeBack();
      }, 200);
    });
    tagObs.observe(document.body, { childList: true, subtree: true });
    startThemeFx();
    startThemeMenu();
    ensureHomeBack();
    // 首屏侧栏可能晚挂载
    setTimeout(ensureHomeBack, 400);
    setTimeout(ensureHomeBack, 1200);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
