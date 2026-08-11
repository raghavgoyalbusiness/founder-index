import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode, RefObject } from 'react';
import { u } from '~/lib/url';

/**
 * Search, in two shapes.
 *
 *   mode="inline"   the live field on the homepage
 *   mode="palette"  the ⌘K dialog available on every page
 *
 * Neither the index nor Fuse is loaded until you interact — the page itself
 * ships almost no JavaScript, which is the point of a content site. If JS
 * never arrives, the stage index below is a complete, browsable list.
 */

interface Doc {
  n: string; // name
  w: string; // what
  c: string; // category
  t: string[]; // tags
  s: string; // stage name
  h: string; // href
  v: boolean; // unverified
}

interface Loaded {
  search: (q: string) => Doc[];
}

let cache: Promise<Loaded> | null = null;

function loadIndex(): Promise<Loaded> {
  if (!cache) {
    cache = Promise.all([
      fetch(u('/search-index.json')).then((r) => r.json() as Promise<Doc[]>),
      import('fuse.js'),
    ]).then(([docs, mod]) => {
      const Fuse = mod.default;
      const fuse = new Fuse(docs, {
        keys: [
          { name: 'n', weight: 3 },
          { name: 'w', weight: 1.5 },
          { name: 'c', weight: 1 },
          { name: 't', weight: 0.9 },
          { name: 's', weight: 0.5 },
        ],
        threshold: 0.3,
        ignoreLocation: true,
        minMatchCharLength: 3,
        includeScore: true,
      });

      const lower = (s: string) => s.toLowerCase();
      const haystack = docs.map((d) => ({
        doc: d,
        n: lower(d.n),
        w: lower(d.w),
        c: lower(d.c),
        t: d.t.join(' ').toLowerCase(),
      }));

      /**
       * Literal matches first, fuzzy only as a tail.
       *
       * Fuse alone gets this wrong in both directions: left loose it matches
       * "seis" to "Pexels", and tightened with a score cutoff it drops
       * Northbeam for "attribution" — because a description-only hit scores
       * badly against a name-weighted key set. Since the whole premise is that
       * you search for your problem ("attribution", "cap table") and not the
       * product name, description hits have to be first-class.
       */
      return {
        search: (raw: string) => {
          const q = lower(raw.trim());
          const ranked: { doc: Doc; rank: number }[] = [];
          const seen = new Set<string>();

          for (const item of haystack) {
            const rank = item.n.startsWith(q)
              ? 0
              : item.n.includes(q)
                ? 1
                : item.t.includes(q)
                  ? 2
                  : item.c.includes(q)
                    ? 3
                    : item.w.includes(q)
                      ? 4
                      : -1;
            if (rank >= 0) {
              ranked.push({ doc: item.doc, rank });
              seen.add(item.doc.h);
            }
          }

          ranked.sort((a, b) => a.rank - b.rank || a.doc.n.localeCompare(b.doc.n));

          const fuzzy = fuse
            .search(raw)
            .filter((hit) => (hit.score ?? 1) <= 0.45 && !seen.has(hit.item.h))
            .map((hit) => hit.item);

          return [...ranked.map((r) => r.doc), ...fuzzy];
        },
      };
    });
  }
  return cache;
}

const isMac = () =>
  typeof navigator !== 'undefined' && /mac/i.test(navigator.platform || navigator.userAgent);

function useSearch(limit: number) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Doc[]>([]);
  const engine = useRef<Loaded | null>(null);

  const prime = useCallback(() => {
    if (!engine.current) loadIndex().then((e) => (engine.current = e));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    loadIndex().then((e) => {
      engine.current = e;
      if (!cancelled) setResults(e.search(q).slice(0, limit));
    });
    return () => {
      cancelled = true;
    };
  }, [query, limit]);

  return { query, setQuery, results, prime };
}

function Results({
  results,
  query,
  activeIndex,
  listId,
  onHover,
}: {
  results: Doc[];
  query: string;
  activeIndex: number;
  listId: string;
  onHover: (i: number) => void;
}) {
  if (query.trim().length < 2) return null;

  if (results.length === 0) {
    return (
      <div className="results">
        <p className="empty">
          Nothing matches “{query.trim()}”. It might not be here yet —{' '}
          <a href={u('/submit')} style={{ color: 'var(--signal)' }}>
            add it
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="results" role="listbox" id={listId} aria-label="Search results">
      {results.map((doc, i) => (
        <a
          key={doc.h}
          href={u(doc.h)}
          className="result"
          role="option"
          id={`${listId}-${i}`}
          aria-selected={i === activeIndex}
          data-active={i === activeIndex}
          onMouseEnter={() => onHover(i)}
        >
          <span className="result__name">{doc.n}</span>
          <span className="result__stage">
            {doc.s}
            {doc.v ? ' · unverified' : ''}
          </span>
          <span className="result__what">{doc.w}</span>
        </a>
      ))}
    </div>
  );
}

function Field({
  value,
  onChange,
  onFocus,
  onKeyDown,
  placeholder,
  inputRef,
  listId,
  activeIndex,
  hasResults,
  trailing,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  onFocus?: () => void;
  onKeyDown?: (e: ReactKeyboardEvent<HTMLInputElement>) => void;
  placeholder: string;
  inputRef: RefObject<HTMLInputElement | null>;
  listId: string;
  activeIndex: number;
  hasResults: boolean;
  trailing?: ReactNode;
  autoFocus?: boolean;
}) {
  return (
    <div className="search-field">
      <svg
        width="15"
        height="15"
        viewBox="0 0 16 16"
        aria-hidden="true"
        style={{ flex: '0 0 auto', color: 'var(--muted)' }}
      >
        <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="m10.5 10.5 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={hasResults}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          hasResults && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
        }
        aria-label="Search every resource"
        placeholder={placeholder}
        value={value}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
      />
      {trailing}
    </div>
  );
}

export default function Search({ mode }: { mode: 'inline' | 'palette' }) {
  const limit = mode === 'palette' ? 8 : 10;
  const { query, setQuery, results, prime } = useSearch(limit);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const [mac, setMac] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const listId = useId();

  useEffect(() => setMac(isMac()), []);

  // Someone may have typed before hydration finished — pick that up.
  useEffect(() => {
    const typed = inputRef.current?.value;
    if (typed && mode === 'inline') setQuery(typed);
  }, [mode, setQuery]);

  useEffect(() => setActiveIndex(-1), [query]);

  const navigate = (i: number) => {
    const doc = results[i];
    if (doc) window.location.href = u(doc.h);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (results.length ? (i + 1) % results.length : -1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (results.length ? (i <= 0 ? results.length - 1 : i - 1) : -1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0) {
        e.preventDefault();
        navigate(activeIndex);
      } else if (results.length === 1) {
        e.preventDefault();
        navigate(0);
      }
    }
  };

  // ---- palette: global shortcuts -----------------------------------------
  const openPalette = useCallback(() => {
    prime();
    setOpen(true);
  }, [prime]);

  useEffect(() => {
    if (mode !== 'palette') return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.tagName === 'SELECT' ||
          el.isContentEditable);

      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        openPalette();
      } else if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        openPalette();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mode, openPalette]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      requestAnimationFrame(() => inputRef.current?.focus());
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  if (mode === 'palette') {
    return (
      <>
        <button
          type="button"
          className="chip"
          onClick={openPalette}
          onMouseEnter={prime}
          aria-label="Search every resource"
          aria-haspopup="dialog"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path
              d="m10.5 10.5 4 4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          <span aria-hidden="true">{mac ? '⌘K' : 'Ctrl K'}</span>
        </button>

        <dialog
          ref={dialogRef}
          className="palette"
          aria-label="Search"
          onClose={() => {
            setOpen(false);
            setQuery('');
          }}
          onClick={(e) => {
            if (e.target === dialogRef.current) setOpen(false);
          }}
        >
          <div className="palette__body">
            <Field
              value={query}
              onChange={setQuery}
              onKeyDown={onKeyDown}
              placeholder="Search 211 resources…"
              inputRef={inputRef}
              listId={listId}
              activeIndex={activeIndex}
              hasResults={results.length > 0}
              trailing={<span className="kbd">esc</span>}
            />
            <Results
              results={results}
              query={query}
              activeIndex={activeIndex}
              listId={listId}
              onHover={setActiveIndex}
            />
          </div>
        </dialog>
      </>
    );
  }

  return (
    <div>
      <Field
        value={query}
        onChange={setQuery}
        onFocus={prime}
        onKeyDown={onKeyDown}
        placeholder="Search by name, problem or tag — try “attribution” or “seis”"
        inputRef={inputRef}
        listId={listId}
        activeIndex={activeIndex}
        hasResults={results.length > 0}
        trailing={<span className="kbd">{mac ? '⌘K' : 'Ctrl K'}</span>}
      />
      <Results
        results={results}
        query={query}
        activeIndex={activeIndex}
        listId={listId}
        onHover={setActiveIndex}
      />
      <noscript>
        <p style={{ marginTop: '0.6rem', color: 'var(--muted)', fontSize: '0.9375rem' }}>
          Search needs JavaScript. The full index is right below, and every stage page lists
          everything in it.
        </p>
      </noscript>
    </div>
  );
}
