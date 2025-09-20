import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import apiRoutes from "../../../../public/apis/apiRoutes";
import { authFetch } from "../../../../public/auth/auth";

interface BookHit {
  id?: string;
  title?: string;
  authors?: string[];
  thumbnail?: string;
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
  const modalRef = useRef<HTMLDivElement | null>(null);
  const startedOutsideRef = useRef(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSelected(null);
      setBusy(false);
    }
  }, [open]);

  // Close when the initial pointerdown was outside the modal.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node | null;
      if (!modalRef.current) return;
      // mark if the pointerdown started outside the modal
      startedOutsideRef.current = target
        ? !modalRef.current.contains(target)
        : false;
    }

    function onPointerUp() {
      // if the interaction started outside, close the modal on pointerup
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
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => void bookSearch(query), 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function bookSearch(q: string) {
    try {
      const res = await authFetch(
        `${apiRoutes.books.search}?query=${encodeURIComponent(q)}`
      );
      if (!res.ok) throw new Error("Search failed");
      const json = await res.json();
      setResults(json.books || []);
    } catch (err) {
      console.error("Book search error", err);
      setResults([]);
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
      // dispatch bookAdded so lists refresh
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
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-start justify-center z-50 p-6">
      <div
        ref={modalRef}
        className="bg-gray-900 rounded-lg w-full max-w-2xl mx-auto mt-16 overflow-hidden"
      >
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">
            Search and add books
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            Close
          </button>
        </div>
        <div className="p-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700"
            placeholder="Search by title or author..."
            autoFocus
          />
          <div
            ref={resultsRef}
            id="search-results"
            className="mt-4 max-h-64 overflow-auto space-y-2"
          >
            {results.length === 0 && query.trim().length >= 2 && (
              <p className="text-sm text-gray-400">No results found</p>
            )}
            {results.map((it, idx) => (
              <div
                key={idx}
                className={`p-3 rounded bg-gray-800 hover:bg-gray-700 cursor-pointer flex gap-3 items-center ${
                  selected === it ? "selected border border-indigo-600" : ""
                }`}
                onClick={() => setSelected(it)}
              >
                <div className="w-12 h-16 bg-gray-700 flex-shrink-0">
                  {it.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={it.thumbnail}
                      alt="cover"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No cover
                    </div>
                  )}
                </div>
                <div className="flex-1 text-white">
                  <div className="font-semibold">
                    {escapeHtml(it.title || "Untitled")}
                  </div>
                  <div className="text-sm text-gray-400">
                    {escapeHtml(
                      it.authors && it.authors.length > 0
                        ? it.authors.join(", ")
                        : "Unknown author"
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-gray-700 flex justify-end gap-2">
          <button
            onClick={handleAddSelected}
            disabled={!selected || busy}
            className="bg-indigo-600 disabled:opacity-50 text-white px-4 py-2 rounded"
          >
            {busy ? "Adding..." : "Add selected"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
