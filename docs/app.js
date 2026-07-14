/* 對齊：歸墟 靜態閱讀器 — reader.tsx 的原生 JS 移植版（無框架、自我包含） */
(function () {
  "use strict";

  var CHAPTERS = [
    { id: "chapter-01", number: "01", title: "溯光", file: "01-溯光.md", minutes: 9, kind: "chapter" },
    { id: "chapter-02", number: "02", title: "巡檢", file: "02-巡檢.md", minutes: 8, kind: "chapter" },
    { id: "chapter-03", number: "03", title: "貫穿", file: "03-貫穿.md", minutes: 8, kind: "chapter" },
    { id: "chapter-04", number: "04", title: "歸墟", file: "04-歸墟.md", minutes: 7, kind: "chapter" },
    { id: "chapter-05", number: "05", title: "拾荒者", file: "05-拾荒者.md", minutes: 8, kind: "chapter" },
    { id: "chapter-06", number: "06", title: "銹林", file: "06-銹林.md", minutes: 8, kind: "chapter" },
    { id: "chapter-07", number: "07", title: "五人", file: "07-五人.md", minutes: 8, kind: "chapter" },
    { id: "chapter-08", number: "08", title: "途中", file: "08-途中.md", minutes: 7, kind: "chapter" },
    { id: "chapter-09", number: "09", title: "元樹", file: "09-元樹.md", minutes: 7, kind: "chapter" },
    { id: "chapter-10", number: "10", title: "先知", file: "10-先知.md", minutes: 7, kind: "chapter" },
    { id: "chapter-11", number: "11", title: "對齊", file: "11-對齊.md", minutes: 7, kind: "chapter" },
    { id: "chapter-12", number: "12", title: "眾水所歸", file: "12-眾水所歸.md", minutes: 8, kind: "chapter" },
    { id: "character-shen-ningyu", number: "人", title: "沈寧嶼人物誌", file: "00A-人物誌-沈寧嶼.md", minutes: 8, kind: "appendix" },
    { id: "appendix", number: "附", title: "設定集", file: "00-設定集.md", minutes: 32, kind: "appendix" },
  ];
  var BODY = CHAPTERS.filter(function (c) { return c.kind === "chapter"; });
  var STORAGE_KEY = "guixu-reader-v1";

  var THEMES = [
    ["paper", "日光", "#f5f2ea"],
    ["sepia", "暮紙", "#e8deca"],
    ["space", "深空", "#11181c"],
  ];

  // ---- 狀態 ----
  var state = {
    activeIndex: 0,
    theme: "paper",
    font: "serif",
    fontSize: 20,
    lineHeight: 1.95,
    contentWidth: 680,
    progress: 0,
    drawerOpen: false,
    settingsOpen: false,
  };
  var positions = {};
  var hydrated = false;
  var loadToken = 0;

  function readSaved() {
    try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") || {}; }
    catch (e) { return {}; }
  }
  function saveState() {
    var saved = readSaved();
    var chapter = CHAPTERS[state.activeIndex];
    var payload = {
      activeId: chapter.id,
      theme: state.theme,
      font: state.font,
      fontSize: state.fontSize,
      lineHeight: state.lineHeight,
      contentWidth: state.contentWidth,
      positions: positions,
    };
    if (saved && typeof saved === "object") {
      for (var k in saved) { if (!(k in payload)) payload[k] = saved[k]; }
    }
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch (e) {}
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ---- 建立固定外框（只建一次）----
  var app = document.getElementById("app");

  function shellTemplate() {
    var chapterButtons = BODY.map(function (item, index) {
      return (
        '<button class="chapter-btn" data-index="' + index + '">' +
        '<span class="chapter-number">' + esc(item.number) + "</span>" +
        '<span class="chapter-name">' + esc(item.title) + "</span>" +
        '<span class="chapter-time">' + item.minutes + " 分</span>" +
        "</button>"
      );
    }).join("");

    return (
      '<div class="reader-shell">' +
        '<div class="cosmos" aria-hidden="true"></div>' +
        '<aside class="sidebar" aria-label="章節目錄">' +
          '<div class="book-mark">' +
            '<div class="orbit-mark" aria-hidden="true"><span></span></div>' +
            "<div><p class=\"eyebrow\">星際生存物語</p><h1>對齊：歸墟</h1></div>" +
          "</div>" +
          '<p class="book-note">所有失聯的航線，<br />最後都流向同一顆星。</p>' +
          '<div class="toc-heading"><span>正文</span><span>12 章</span></div>' +
          '<nav class="chapter-list">' + chapterButtons + "</nav>" +
          '<div class="toc-heading appendix-heading"><span>附錄</span></div>' +
          '<button class="appendix-link" data-index="' + (CHAPTERS.length - 1) + '">' +
            '<span class="chapter-number">附</span>' +
            '<span class="chapter-name">世界設定集</span>' +
            '<span class="chapter-time">32 分</span>' +
          "</button>" +
        "</aside>" +
        '<div class="reading-stage">' +
          '<header class="topbar">' +
            '<button class="icon-button menu-button" data-act="open-drawer" aria-label="開啟章節目錄"><span></span><span></span><span></span></button>' +
            '<div class="current-location"><span>《對齊：歸墟》</span><i aria-hidden="true"></i><span class="loc-chapter"></span></div>' +
            '<div class="reading-status"><span class="status-pct">0%</span><div><i class="status-bar"></i></div></div>' +
            '<button class="settings-button" data-act="toggle-settings" aria-expanded="false" aria-controls="reader-settings"><span class="type-icon" aria-hidden="true">文</span><span>閱讀設定</span></button>' +
            '<div class="chapter-progress" aria-hidden="true"></div>' +
          "</header>" +
          '<div class="settings-mount"></div>' +
          '<main class="reader-main">' +
            '<article class="novel-article">' +
              '<header class="chapter-header">' +
                '<div class="chapter-kicker"><span class="kicker-label"></span><i></i><span class="kicker-time"></span></div>' +
                '<h2 class="chapter-title"></h2>' +
                '<div class="title-ornament" aria-hidden="true"><i></i><span>✦</span><i></i></div>' +
              "</header>" +
              '<div class="article-body"></div>' +
            "</article>" +
          "</main>" +
        "</div>" +
      "</div>"
    );
  }

  // ---- 局部更新 ----
  var el = {};
  function cacheEls() {
    el.shell = app.querySelector(".reader-shell");
    el.sidebar = app.querySelector(".sidebar");
    el.locChapter = app.querySelector(".loc-chapter");
    el.statusPct = app.querySelector(".status-pct");
    el.statusBar = app.querySelector(".status-bar");
    el.chapterProgress = app.querySelector(".chapter-progress");
    el.settingsMount = app.querySelector(".settings-mount");
    el.settingsButton = app.querySelector(".settings-button");
    el.kickerLabel = app.querySelector(".kicker-label");
    el.kickerTime = app.querySelector(".kicker-time");
    el.chapterTitle = app.querySelector(".chapter-title");
    el.articleBody = app.querySelector(".article-body");
    el.stage = app.querySelector(".reading-stage");
  }

  function applyDisplay() {
    el.shell.setAttribute("data-theme", state.theme);
    el.shell.setAttribute("data-font", state.font);
    el.shell.style.setProperty("--reader-size", state.fontSize + "px");
    el.shell.style.setProperty("--reader-leading", String(state.lineHeight));
    el.shell.style.setProperty("--reader-width", state.contentWidth + "px");
    document.querySelector('meta[name="theme-color"]').setAttribute(
      "content", state.theme === "space" ? "#11181c" : state.theme === "sepia" ? "#e8deca" : "#f5f2ea"
    );
  }

  function renderChapterList() {
    var chapter = CHAPTERS[state.activeIndex];
    var btns = el.sidebar.querySelectorAll(".chapter-btn");
    BODY.forEach(function (item, i) {
      var active = chapter.id === item.id;
      btns[i].classList.toggle("active", active);
      if (active) btns[i].setAttribute("aria-current", "page"); else btns[i].removeAttribute("aria-current");
    });
    var appendixBtn = el.sidebar.querySelector(".appendix-link");
    var appActive = chapter.kind === "appendix";
    appendixBtn.classList.toggle("active", appActive);
    if (appActive) appendixBtn.setAttribute("aria-current", "page"); else appendixBtn.removeAttribute("aria-current");
  }

  function renderTopbar() {
    var chapter = CHAPTERS[state.activeIndex];
    el.locChapter.textContent = chapter.kind === "appendix" ? "世界設定" : "第 " + chapter.number + " 章";
  }

  function renderProgress() {
    var pct = Math.round(state.progress * 100);
    el.statusPct.textContent = pct + "%";
    el.statusBar.style.width = state.progress * 100 + "%";
    el.chapterProgress.style.width = state.progress * 100 + "%";
    var status = app.querySelector(".reading-status");
    if (status) status.setAttribute("aria-label", "本章已閱讀 " + pct + "%");
  }

  function renderArticleHeader() {
    var chapter = CHAPTERS[state.activeIndex];
    el.kickerLabel.textContent = chapter.kind === "appendix" ? "APPENDIX" : "CHAPTER " + chapter.number;
    el.kickerTime.textContent = "約 " + chapter.minutes + " 分鐘";
    el.chapterTitle.textContent = chapter.title;
  }

  function renderArticleBody(mode, html) {
    var chapter = CHAPTERS[state.activeIndex];
    if (mode === "loading") {
      el.articleBody.innerHTML =
        '<div class="chapter-loading" aria-live="polite"><i></i><i></i><i></i><span>正在展開航誌…</span></div>';
      return;
    }
    if (mode === "error") {
      el.articleBody.innerHTML =
        '<div class="chapter-error" role="alert"><p>這一章暫時無法載入。</p><button data-act="reload">重新載入</button></div>';
      el.articleBody.querySelector('[data-act="reload"]').addEventListener("click", function () {
        window.location.reload();
      });
      return;
    }
    // content + footer
    var index = state.activeIndex;
    var prev = chapter.kind === "chapter" && index > 0 ? CHAPTERS[index - 1] : null;
    var next = chapter.kind === "chapter" && index < BODY.length - 1 ? CHAPTERS[index + 1] : null;

    var navLeft = prev
      ? '<button class="previous" data-goto="' + (index - 1) + '"><span>← 上一章</span><strong>' + esc(prev.title) + "</strong></button>"
      : "<span></span>";
    var navRight;
    if (next) {
      navRight = '<button class="next" data-goto="' + (index + 1) + '"><span>下一章 →</span><strong>' + esc(next.title) + "</strong></button>";
    } else if (chapter.kind === "chapter") {
      navRight = '<button class="next" data-goto="' + (CHAPTERS.length - 1) + '"><span>繼續探索 →</span><strong>世界設定集</strong></button>';
    } else {
      navRight = "<span></span>";
    }

    el.articleBody.innerHTML =
      '<div class="markdown-body">' + html + "</div>" +
      '<footer class="chapter-footer">' +
        '<div class="end-mark" aria-hidden="true"><span>✦</span></div>' +
        "<p>" + (chapter.kind === "appendix" ? "設定集完" : "第 " + chapter.number + " 章完") + "</p>" +
        '<div class="chapter-nav">' + navLeft + navRight + "</div>" +
      "</footer>";

    el.articleBody.querySelectorAll("[data-goto]").forEach(function (btn) {
      btn.addEventListener("click", function () { goToChapter(Number(btn.getAttribute("data-goto"))); });
    });

    el.articleBody.querySelectorAll(".markdown-body a[href]").forEach(function (link) {
      var href = (link.getAttribute("href") || "").replace(/^\.\//, "").split("#")[0];
      var targetIndex = CHAPTERS.findIndex(function (item) { return item.file === href; });
      if (targetIndex < 0) return;
      link.addEventListener("click", function (event) {
        event.preventDefault();
        goToChapter(targetIndex);
      });
    });
  }

  // ---- 章節載入 ----
  function loadChapter() {
    var chapter = CHAPTERS[state.activeIndex];
    var token = ++loadToken;
    renderArticleBody("loading");

    fetch(encodeURI("novel/" + chapter.file))
      .then(function (r) { if (!r.ok) throw new Error("unavailable"); return r.text(); })
      .then(function (md) {
        if (token !== loadToken) return;
        var withoutTitle = md.replace(/^#\s+.+\n+/, "");
        var html = window.marked.parse(withoutTitle, { gfm: true });
        renderArticleBody("content", html);
        window.requestAnimationFrame(function () {
          var saved = positions[chapter.id] || 0;
          var available = document.documentElement.scrollHeight - window.innerHeight;
          window.scrollTo({ top: available * saved, behavior: "instant" });
        });
      })
      .catch(function () {
        if (token !== loadToken) return;
        renderArticleBody("error");
      });

    try { window.history.replaceState(null, "", "#" + chapter.id); } catch (e) {}
  }

  // ---- 導覽 ----
  function goToChapter(index) {
    if (index < 0 || index >= CHAPTERS.length) return;
    setDrawer(false);
    setSettings(false);
    state.activeIndex = index;
    renderChapterList();
    renderTopbar();
    renderArticleHeader();
    loadChapter();
    saveState();
  }

  function setDrawer(open) {
    state.drawerOpen = open;
    el.sidebar.classList.toggle("is-open", open);
    var existing = app.querySelector(".drawer-backdrop");
    if (open && !existing) {
      var b = document.createElement("button");
      b.className = "drawer-backdrop";
      b.setAttribute("aria-label", "關閉目錄");
      b.addEventListener("click", function () { setDrawer(false); });
      el.shell.insertBefore(b, el.stage);
    } else if (!open && existing) {
      existing.remove();
    }
  }

  function setSettings(open) {
    state.settingsOpen = open;
    el.settingsButton.classList.toggle("active", open);
    el.settingsButton.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      el.settingsMount.innerHTML = settingsTemplate();
      wireSettings();
    } else {
      el.settingsMount.innerHTML = "";
    }
  }

  function settingsTemplate() {
    var themeBtns = THEMES.map(function (t) {
      return '<button class="theme-opt' + (state.theme === t[0] ? " selected" : "") + '" data-theme="' + t[0] + '"><i style="background:' + t[2] + '"></i>' + t[1] + "</button>";
    }).join("");

    function range(key, label, min, max, step, display) {
      var fill = ((state[key] - min) / (max - min)) * 100;
      return (
        '<div class="setting-group range-setting">' +
          '<label for="setting-' + key + '">' + label + "<span>" + display + "</span></label>" +
          '<input id="setting-' + key + '" type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + state[key] + '" data-range="' + key + '" style="--range-fill:' + fill + '%" />' +
        "</div>"
      );
    }

    return (
      '<section class="settings-panel" id="reader-settings" aria-label="閱讀設定">' +
        '<div class="settings-title"><div><span class="eyebrow">DISPLAY</span><h2>閱讀設定</h2></div><button data-act="close-settings" aria-label="關閉閱讀設定">×</button></div>' +
        '<div class="setting-group"><label>閱讀色調</label><div class="theme-options">' + themeBtns + "</div></div>" +
        '<div class="setting-group"><label>字體風格</label><div class="segment-control">' +
          '<button class="font-opt' + (state.font === "serif" ? " selected" : "") + '" data-font="serif">襯線</button>' +
          '<button class="font-opt' + (state.font === "sans" ? " selected" : "") + '" data-font="sans">黑體</button>' +
        "</div></div>" +
        range("fontSize", "字級", 17, 26, 1, state.fontSize + "px") +
        range("lineHeight", "行距", 1.65, 2.25, 0.05, state.lineHeight.toFixed(2)) +
        range("contentWidth", "欄寬", 560, 820, 20, state.contentWidth + "px") +
        '<p class="keyboard-note"><kbd>←</kbd><kbd>→</kbd> 可切換前後章</p>' +
      "</section>"
    );
  }

  function wireSettings() {
    var panel = el.settingsMount;
    panel.querySelector('[data-act="close-settings"]').addEventListener("click", function () { setSettings(false); });

    panel.querySelectorAll("[data-theme]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.theme = btn.getAttribute("data-theme");
        panel.querySelectorAll("[data-theme]").forEach(function (b) { b.classList.toggle("selected", b === btn); });
        applyDisplay(); saveState();
      });
    });
    panel.querySelectorAll("[data-font]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.font = btn.getAttribute("data-font");
        panel.querySelectorAll("[data-font]").forEach(function (b) { b.classList.toggle("selected", b === btn); });
        applyDisplay(); saveState();
      });
    });
    panel.querySelectorAll("[data-range]").forEach(function (input) {
      input.addEventListener("input", function () {
        var key = input.getAttribute("data-range");
        var val = Number(input.value);
        state[key] = val;
        var min = Number(input.min), max = Number(input.max);
        input.style.setProperty("--range-fill", ((val - min) / (max - min)) * 100 + "%");
        var span = input.parentNode.querySelector("label span");
        if (key === "fontSize") span.textContent = val + "px";
        else if (key === "lineHeight") span.textContent = val.toFixed(2);
        else span.textContent = val + "px";
        applyDisplay(); saveState();
      });
    });
  }

  // ---- 捲動進度 ----
  var progressFrame = 0;
  function updateProgress() {
    window.cancelAnimationFrame(progressFrame);
    progressFrame = window.requestAnimationFrame(function () {
      var available = document.documentElement.scrollHeight - window.innerHeight;
      var next = available > 0 ? Math.min(1, Math.max(0, window.scrollY / available)) : 0;
      state.progress = next;
      positions[CHAPTERS[state.activeIndex].id] = next;
      renderProgress();
    });
  }

  // ---- 初始化 ----
  function init() {
    app.innerHTML = shellTemplate();
    cacheEls();

    // 事件：頂欄按鈕
    app.querySelector('[data-act="open-drawer"]').addEventListener("click", function () { setDrawer(true); });
    el.settingsButton.addEventListener("click", function () { setSettings(!state.settingsOpen); });

    // 側欄章節按鈕
    el.sidebar.querySelectorAll(".chapter-btn").forEach(function (btn) {
      btn.addEventListener("click", function () { goToChapter(Number(btn.getAttribute("data-index"))); });
    });
    el.sidebar.querySelector(".appendix-link").addEventListener("click", function () {
      goToChapter(Number(el.sidebar.querySelector(".appendix-link").getAttribute("data-index")));
    });

    // 載入已存狀態
    var saved = readSaved();
    if (saved.theme) state.theme = saved.theme;
    if (saved.font) state.font = saved.font;
    if (typeof saved.fontSize === "number") state.fontSize = saved.fontSize;
    if (typeof saved.lineHeight === "number") state.lineHeight = saved.lineHeight;
    if (typeof saved.contentWidth === "number") state.contentWidth = saved.contentWidth;
    if (saved.positions && typeof saved.positions === "object") positions = saved.positions;

    var hashId = (window.location.hash || "").replace("#", "");
    var requestedId = CHAPTERS.some(function (c) { return c.id === hashId; }) ? hashId : saved.activeId;
    var idx = CHAPTERS.findIndex(function (c) { return c.id === requestedId; });
    if (idx >= 0) state.activeIndex = idx;

    hydrated = true;

    applyDisplay();
    renderChapterList();
    renderTopbar();
    renderArticleHeader();
    renderProgress();
    loadChapter();

    // 捲動 / 縮放
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    // 鍵盤
    window.addEventListener("keydown", function (e) {
      var tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      var chapter = CHAPTERS[state.activeIndex];
      var index = state.activeIndex;
      var hasPrev = chapter.kind === "chapter" && index > 0;
      var hasNext = chapter.kind === "chapter" && index < BODY.length - 1;
      if (e.key === "ArrowLeft" && hasPrev) goToChapter(index - 1);
      if (e.key === "ArrowRight" && hasNext) goToChapter(index + 1);
      if (e.key === "Escape") { setDrawer(false); setSettings(false); }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
