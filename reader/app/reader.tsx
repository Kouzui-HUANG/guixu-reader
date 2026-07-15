"use client";

import { marked } from "marked";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Theme = "paper" | "sepia" | "space";
type FontStyle = "serif" | "sans";

type Chapter = {
  id: string;
  number: string;
  title: string;
  file: string;
  minutes: number;
  kind: "chapter" | "appendix";
};

const CHAPTERS: Chapter[] = [
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

const STORAGE_KEY = "guixu-reader-v1";

type ReaderState = {
  activeId?: string;
  theme?: Theme;
  font?: FontStyle;
  fontSize?: number;
  lineHeight?: number;
  contentWidth?: number;
  positions?: Record<string, number>;
};

function readSavedState(): ReaderState {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") as ReaderState;
  } catch {
    return {};
  }
}

export function NovelReader() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [theme, setTheme] = useState<Theme>("paper");
  const [font, setFont] = useState<FontStyle>("serif");
  const [fontSize, setFontSize] = useState(20);
  const [lineHeight, setLineHeight] = useState(1.95);
  const [contentWidth, setContentWidth] = useState(680);
  const [progress, setProgress] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const hydrated = useRef(false);
  const positions = useRef<Record<string, number>>({});

  const chapter = CHAPTERS[activeIndex];
  const bodyChapters = useMemo(() => CHAPTERS.filter((item) => item.kind === "chapter"), []);
  const appendixChapters = useMemo(() => CHAPTERS.filter((item) => item.kind === "appendix"), []);
  const previous = activeIndex > 0 ? CHAPTERS[activeIndex - 1] : null;
  const next = activeIndex < CHAPTERS.length - 1 ? CHAPTERS[activeIndex + 1] : null;
  const enteringAppendix = chapter.kind === "chapter" && next?.kind === "appendix";

  useEffect(() => {
    const saved = readSavedState();
    const hashId = window.location.hash.replace("#", "");
    const requestedId = CHAPTERS.some((item) => item.id === hashId) ? hashId : saved.activeId;
    const savedIndex = CHAPTERS.findIndex((item) => item.id === requestedId);

    if (savedIndex >= 0) setActiveIndex(savedIndex);
    if (saved.theme) setTheme(saved.theme);
    if (saved.font) setFont(saved.font);
    if (saved.fontSize) setFontSize(saved.fontSize);
    if (saved.lineHeight) setLineHeight(saved.lineHeight);
    if (saved.contentWidth) setContentWidth(saved.contentWidth);
    positions.current = saved.positions || {};
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;

    let cancelled = false;
    setLoading(true);
    setLoadError(false);

    fetch(encodeURI(`/novel/${chapter.file}`))
      .then((response) => {
        if (!response.ok) throw new Error("chapter unavailable");
        return response.text();
      })
      .then((markdown) => {
        if (cancelled) return;
        const withoutTitle = markdown.replace(/^#\s+.+\n+/, "");
        setContent(marked.parse(withoutTitle, { gfm: true }) as string);
        setLoading(false);

        window.requestAnimationFrame(() => {
          const savedPosition = positions.current[chapter.id] || 0;
          const available = document.documentElement.scrollHeight - window.innerHeight;
          window.scrollTo({ top: available * savedPosition, behavior: "instant" });
        });
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(true);
          setLoading(false);
        }
      });

    window.history.replaceState(null, "", `#${chapter.id}`);
    return () => {
      cancelled = true;
    };
  }, [chapter.file, chapter.id]);

  useEffect(() => {
    if (!hydrated.current) return;
    const saved = readSavedState();
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...saved,
        activeId: chapter.id,
        theme,
        font,
        fontSize,
        lineHeight,
        contentWidth,
        positions: positions.current,
      } satisfies ReaderState),
    );
  }, [chapter.id, contentWidth, font, fontSize, lineHeight, theme]);

  useEffect(() => {
    let frame = 0;
    const updateProgress = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const available = document.documentElement.scrollHeight - window.innerHeight;
        const nextProgress = available > 0 ? Math.min(1, Math.max(0, window.scrollY / available)) : 0;
        setProgress(nextProgress);
        positions.current[chapter.id] = nextProgress;
      });
    };
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, [chapter.id, content]);

  const goToChapter = useCallback((index: number) => {
    setDrawerOpen(false);
    setSettingsOpen(false);
    setActiveIndex(index);
  }, []);

  const handleMarkdownClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const link = target.closest("a[href]");
    if (!link) return;

    const href = (link.getAttribute("href") || "").replace(/^\.\//, "").split("#")[0];
    const targetIndex = CHAPTERS.findIndex((item) => item.file === href);
    if (targetIndex < 0) return;

    event.preventDefault();
    goToChapter(targetIndex);
  }, [goToChapter]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.key === "ArrowLeft" && previous) goToChapter(activeIndex - 1);
      if (event.key === "ArrowRight" && next) goToChapter(activeIndex + 1);
      if (event.key === "Escape") {
        setDrawerOpen(false);
        setSettingsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeIndex, goToChapter, next, previous]);

  const shellStyle = {
    "--reader-size": `${fontSize}px`,
    "--reader-leading": lineHeight,
    "--reader-width": `${contentWidth}px`,
  } as React.CSSProperties;

  return (
    <div className="reader-shell" data-theme={theme} data-font={font} style={shellStyle}>
      <div className="cosmos" aria-hidden="true" />

      <aside className={`sidebar ${drawerOpen ? "is-open" : ""}`} aria-label="章節目錄">
        <div className="book-mark">
          <div className="orbit-mark" aria-hidden="true"><span /></div>
          <div>
            <p className="eyebrow">星際生存物語</p>
            <h1>對齊：歸墟</h1>
          </div>
        </div>

        <p className="book-note">所有失聯的航線，<br />最後都流向同一顆星。</p>

        <div className="toc-heading">
          <span>正文</span>
          <span>12 章</span>
        </div>
        <nav className="chapter-list">
          {bodyChapters.map((item, index) => (
            <button
              className={chapter.id === item.id ? "active" : ""}
              key={item.id}
              onClick={() => goToChapter(index)}
              aria-current={chapter.id === item.id ? "page" : undefined}
            >
              <span className="chapter-number">{item.number}</span>
              <span className="chapter-name">{item.title}</span>
              <span className="chapter-time">{item.minutes} 分</span>
            </button>
          ))}
        </nav>

        <div className="toc-heading appendix-heading"><span>附錄</span><span>{appendixChapters.length} 篇</span></div>
        <nav className="chapter-list">
          {appendixChapters.map((item) => {
            const index = CHAPTERS.findIndex((entry) => entry.id === item.id);
            return (
              <button
                className={`appendix-link ${chapter.id === item.id ? "active" : ""}`}
                key={item.id}
                onClick={() => goToChapter(index)}
                aria-current={chapter.id === item.id ? "page" : undefined}
              >
                <span className="chapter-number">{item.number}</span>
                <span className="chapter-name">{item.title}</span>
                <span className="chapter-time">{item.minutes} 分</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {drawerOpen && <button className="drawer-backdrop" onClick={() => setDrawerOpen(false)} aria-label="關閉目錄" />}

      <div className="reading-stage">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setDrawerOpen(true)} aria-label="開啟章節目錄">
            <span /><span /><span />
          </button>
          <div className="current-location">
            <span>《對齊：歸墟》</span>
            <i aria-hidden="true" />
            <span>{chapter.kind === "appendix" ? "世界設定" : `第 ${chapter.number} 章`}</span>
          </div>
          <div className="reading-status" aria-label={`本章已閱讀 ${Math.round(progress * 100)}%`}>
            <span>{Math.round(progress * 100)}%</span>
            <div><i style={{ width: `${progress * 100}%` }} /></div>
          </div>
          <button
            className={`settings-button ${settingsOpen ? "active" : ""}`}
            onClick={() => setSettingsOpen((open) => !open)}
            aria-expanded={settingsOpen}
            aria-controls="reader-settings"
          >
            <span className="type-icon" aria-hidden="true">文</span>
            <span>閱讀設定</span>
          </button>
          <div className="chapter-progress" style={{ width: `${progress * 100}%` }} aria-hidden="true" />
        </header>

        {settingsOpen && (
          <section className="settings-panel" id="reader-settings" aria-label="閱讀設定">
            <div className="settings-title">
              <div><span className="eyebrow">DISPLAY</span><h2>閱讀設定</h2></div>
              <button onClick={() => setSettingsOpen(false)} aria-label="關閉閱讀設定">×</button>
            </div>

            <div className="setting-group">
              <label>閱讀色調</label>
              <div className="theme-options">
                {([
                  ["paper", "日光", "#f5f2ea"],
                  ["sepia", "暮紙", "#e8deca"],
                  ["space", "深空", "#11181c"],
                ] as const).map(([value, label, color]) => (
                  <button className={theme === value ? "selected" : ""} key={value} onClick={() => setTheme(value)}>
                    <i style={{ background: color }} />{label}
                  </button>
                ))}
              </div>
            </div>

            <div className="setting-group">
              <label>字體風格</label>
              <div className="segment-control">
                <button className={font === "serif" ? "selected" : ""} onClick={() => setFont("serif")}>襯線</button>
                <button className={font === "sans" ? "selected" : ""} onClick={() => setFont("sans")}>黑體</button>
              </div>
            </div>

            <RangeSetting label="字級" value={fontSize} min={17} max={26} step={1} display={`${fontSize}px`} onChange={setFontSize} />
            <RangeSetting label="行距" value={lineHeight} min={1.65} max={2.25} step={0.05} display={lineHeight.toFixed(2)} onChange={setLineHeight} />
            <RangeSetting label="欄寬" value={contentWidth} min={560} max={820} step={20} display={`${contentWidth}px`} onChange={setContentWidth} />

            <p className="keyboard-note"><kbd>←</kbd><kbd>→</kbd> 可切換前後章</p>
          </section>
        )}

        <main className="reader-main">
          <article className="novel-article">
            <header className="chapter-header">
              <div className="chapter-kicker">
                <span>{chapter.kind === "appendix" ? "APPENDIX" : `CHAPTER ${chapter.number}`}</span>
                <i />
                <span>約 {chapter.minutes} 分鐘</span>
              </div>
              <h2>{chapter.title}</h2>
              <div className="title-ornament" aria-hidden="true"><i /><span>✦</span><i /></div>
            </header>

            {loading && (
              <div className="chapter-loading" aria-live="polite">
                <i /><i /><i /><span>正在展開航誌…</span>
              </div>
            )}
            {loadError && (
              <div className="chapter-error" role="alert">
                <p>這一章暫時無法載入。</p>
                <button onClick={() => window.location.reload()}>重新載入</button>
              </div>
            )}
            {!loading && !loadError && (
              <div className="markdown-body" onClick={handleMarkdownClick} dangerouslySetInnerHTML={{ __html: content }} />
            )}

            {!loading && !loadError && (
              <footer className="chapter-footer">
                <div className="end-mark" aria-hidden="true"><span>✦</span></div>
                <p>{chapter.kind === "appendix" ? `${chapter.title}完` : `第 ${chapter.number} 章完`}</p>
                <div className="chapter-nav">
                  {previous ? (
                    <button className="previous" onClick={() => goToChapter(activeIndex - 1)}>
                      <span>← 上一章</span><strong>{previous.title}</strong>
                    </button>
                  ) : <span />}
                  {next ? (
                    <button className="next" onClick={() => goToChapter(activeIndex + 1)}>
                      <span>{enteringAppendix ? "繼續探索 →" : "下一章 →"}</span><strong>{next.title}</strong>
                    </button>
                  ) : <span />}
                </div>
              </footer>
            )}
          </article>
        </main>
      </div>
    </div>
  );
}

function RangeSetting({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div className="setting-group range-setting">
      <label htmlFor={`setting-${label}`}>{label}<span>{display}</span></label>
      <input
        id={`setting-${label}`}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ "--range-fill": `${fill}%` } as React.CSSProperties}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}
