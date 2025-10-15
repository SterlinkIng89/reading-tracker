import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import apiRoutes from "../../../../public/apis/apiRoutes";
import { authFetch } from "../../../../public/auth/auth";

import "../../../styles/loader.css";

interface BookHit {
  id?: string;
  title?: string;
  authors?: string[];
  thumbnail?: string;
  description?: string;
  [k: string]: any;
}

interface AddBookModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AddBookModal({ open, onClose }: AddBookModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookHit[]>([]);
  const [selected, setSelected] = useState<BookHit | null>(null);
  const [busy, setBusy] = useState(false);

  const debounceRef = useRef<number | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const startedOutsideRef = useRef(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const PAGE_SIZE = 10;

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSelected(null);
      setBusy(false);
      setPage(1);
      setHasMore(false);
      setLoadingMore(false);
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node | null;
      if (!modalRef.current) return;
      startedOutsideRef.current = target
        ? !modalRef.current.contains(target)
        : false;
    }

    function onPointerUp() {
      if (startedOutsideRef.current) {
        startedOutsideRef.current = false;
        onClose();
      }
    }

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      startedOutsideRef.current = false;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setPage(1);
      setHasMore(false);
      return;
    }

    setPage(1);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(
      () => void bookSearch(query, 1, false),
      300
    );
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = resultsRef.current;
    if (!sentinel || !root) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const ent = entries[0];
        if (ent.isIntersecting && hasMore && !loadingMore) {
          void bookSearch(query, page + 1, true);
        }
      },
      { root, rootMargin: "200px" }
    );

    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [query, page, hasMore, loadingMore]);

  async function bookSearch(q: string, p = 1, append = false) {
    try {
      if (p > 1) setLoadingMore(true);
      else setLoading(true);
      const res = await authFetch(
        `${apiRoutes.books.search}?query=${encodeURIComponent(
          q
        )}&page=${p}&page_size=${PAGE_SIZE}`
      );
      if (!res.ok) throw new Error("Search failed");
      const json = await res.json();
      const books: BookHit[] = json.books || [];
      if (append) {
        setResults((prev) => [...prev, ...books]);
      } else {
        setResults(books);
        // reset scroll
        requestAnimationFrame(() => {
          const c = resultsRef.current;
          if (c) c.scrollTop = 0;
        });
      }

      const apiHasMore =
        typeof json.hasMore === "boolean"
          ? json.hasMore
          : json.nextPage
          ? true
          : typeof json.totalPages === "number"
          ? p < json.totalPages
          : books.length > 0;
      setHasMore(apiHasMore);
      setPage(p);
    } catch (err) {
      console.error("Book search error", err);
      if (!append) setResults([]);
      setHasMore(false);
    } finally {
      if (p > 1) setLoadingMore(false);
      else setLoading(false);
    }
  }

  function escapeHtml(unsafe: any) {
    return String(unsafe || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async function handleAddSelected() {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await authFetch(apiRoutes.books.library.add, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selected),
      });
      if (!res.ok) throw new Error("Add failed");
      window.dispatchEvent(new CustomEvent("bookAdded"));
      onClose();
    } catch (err) {
      console.error("Add book error", err);
      alert("Could not add the book. Check the console.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-bg-base/50 flex items-start justify-center z-50 p-6">
      <div
        ref={modalRef}
        className="bg-surface-medium rounded-lg w-full max-w-4xl mx-auto mt-12 overflow-hidden"
      >
        <div className="p-4 border-b border-border-strong flex justify-between items-center">
          <h3 className="text-xl font-semibold text-highlight">
            Search and add books
          </h3>
          <button onClick={onClose} className="text-secondary hover:text-highlight focus:outline-none focus:ring-2 focus:ring-accent/60 rounded">
            Close
          </button>
        </div>

        <div className="p-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full p-3 rounded bg-input-bg text-primary border border-input-border placeholder-input-placeholder focus:outline-none focus:ring-1 focus:ring-accent/60 focus:border-input-focus-border transition-shadow duration-200"
            placeholder="Search by title or author..."
            autoFocus
          />

          <div className="mt-4">
            <div
              ref={resultsRef}
              id="search-results"
              className="max-h-[70vh] md:max-h-[70vh] overflow-auto p-2 bg-surface-medium rounded"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Loading Skeleton  */}
                {loading &&
                  [1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="bg-surface-low rounded overflow-hidden animate-pulse p-2 flex gap-3"
                    >
                      <div className="w-[130px] h-[200px] bg-surface-medium flex-shrink-0 rounded" />
                      <div className="flex-1">
                        <div className="h-5 bg-surface-medium rounded w-3/4 mb-3" />
                        <div className="h-4 bg-surface-medium rounded w-1/2 mb-4" />
                        <div className="space-y-2">
                          <div className="h-3 bg-surface-medium rounded w-full" />
                          <div className="h-3 bg-surface-medium rounded w-5/6" />
                          <div className="h-3 bg-surface-medium rounded w-2/3" />
                        </div>
                      </div>
                    </div>
                  ))}

                {/* No results */}
                {!loading &&
                  results.length === 0 &&
                  query.trim().length >= 2 && (
                    <p className="text-sm text-gray-400 col-span-full">
                      No results found
                    </p>
                  )}

                {/* Results */}
                {!loading &&
                  results.map((it, idx) => (
                    <div
                      key={idx}
                      className={`relative bg-surface-medium rounded overflow-hidden shadow-sm hover:shadow-lg transition-transform duration-200 ease-out cursor-pointer p-3 ${
                        selected === it ? "ring-2 ring-accent-base" : ""
                      }`}
                      onClick={() => setSelected(it)}
                      tabIndex={0}
                    >
                      <div className="flex gap-4">
                        <div className="w-[130px] h-[200px] bg-surface-low flex-shrink-0 rounded overflow-hidden">
                          {it.thumbnail ? (
                            <img
                              src={it.thumbnail}
                              alt="cover"
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div
                              className="w-full h-full flex flex-col items-center justify-center text-secondary bg-surface-low border border-border-default rounded"
                              role="img"
                              aria-label="No cover available"
                              title="No cover available"
                            >
                              {/* Broken image / error icon */}
                              <svg
                                className="w-12 h-16"
                                viewBox="0 0 24 32"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <rect
                                  x="1"
                                  y="1"
                                  width="22"
                                  height="30"
                                  rx="2"
                                  fill="#3f3f46"
                                />
                                <path
                                  d="M4 24L9.5 16L13 20.5L18 12"
                                  stroke="#fca5a5"
                                  strokeWidth="1.6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M17 6L7 26"
                                  stroke="#fecaca"
                                  strokeWidth="1.6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <circle cx="18" cy="6" r="2.2" fill="#fecaca" />
                              </svg>
                                <div className="text-xs text-secondary mt-2">No cover</div>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 flex flex-col">
                          <div>
                            <div className="font-semibold text-base text-highlight">
                              {escapeHtml(it.title || "Untitled")}
                            </div>
                            <div className="text-sm text-secondary">
                              {escapeHtml(
                                (it.authors || []).join(", ") ||
                                  "Unknown author"
                              )}
                            </div>
                          </div>

                          <div className="text-xs text-secondary mt-3 line-clamp-4 flex-1">
                            {escapeHtml(
                              it.description || "No description available"
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {loadingMore && (
                <div className="flex items-center justify-center gap-3 py-3" role="status" aria-live="polite">
                  <span className="loader" />
                </div>
              )}

              {!hasMore && results.length > 0 && (
                <div className="text-sm text-secondary text-center py-3">No more results</div>
              )}

              <div ref={sentinelRef} />
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border-strong flex justify-end gap-2">
          <button
            onClick={handleAddSelected}
            disabled={!selected || busy}
            className="bg-accent-base disabled:opacity-50 text-highlight px-4 py-2 rounded hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent/60"
          >
            {busy ? "Adding..." : "Add selected"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
