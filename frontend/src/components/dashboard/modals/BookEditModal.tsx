import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import apiRoutes, { API_BASE } from "../../../../public/apis/apiRoutes";
import { authFetch } from "../../../../public/auth/auth";

type Book = Record<string, any>;

interface Props {
  open: boolean;
  onClose: () => void;
  book?: Book;
}

export default function BookEditModal({ open, onClose, book }: Props) {
  const [addPages, setAddPages] = useState<number>(1);
  const [newTotal, setNewTotal] = useState<number | "">(
    book?.total_pages ?? ""
  );
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const modalRef = useRef<HTMLDivElement | null>(null);
  const startedOutsideRef = useRef(false);

  useEffect(() => {
    if (!open) {
      setAddPages(1);
      setNewTotal(book?.total_pages ?? "");
      setBusy(false);
      setConfirmDelete(false);
    }
  }, [open, book]);

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

  if (!open) return null;

  const bookId = book?._id ?? book?.book_id;

  async function handleAdd() {
    const pages = Math.max(0, Math.floor(addPages || 0));
    if (pages <= 0) return;
    setBusy(true);
    try {
      const currentPage = Number(book?.current_page ?? 0) + pages;
      await authFetch(
        `${API_BASE}/books/user/${encodeURIComponent(String(bookId))}/log`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pages_read: pages,
            current_page: currentPage,
          }),
        }
      );

      window.dispatchEvent(new CustomEvent("bookUpdated"));
      onClose();
    } catch (err) {
      console.error("Add pages error", err);
      alert("Could not add pages. Check console.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateTotal() {
    const t = Number(newTotal);
    if (!Number.isInteger(t) || t < 0) return;
    setBusy(true);
    try {
      window.dispatchEvent(new CustomEvent("bookUpdated"));
      onClose();
    } catch (err) {
      console.error("Update total pages error", err);
      alert("Could not update total pages. Check console.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return setConfirmDelete(true);
    setBusy(true);
    try {
      await authFetch(`${apiRoutes.books.remove}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          book_id: book?.book_id.toString() ?? "",
        }),
      });
      window.dispatchEvent(new CustomEvent("bookRemoved"));
      onClose();
    } catch (err) {
      console.error("Delete book error", err);
      alert("Could not delete book. Check console.");
    } finally {
      setBusy(false);
    }
  }

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-start justify-center z-50 p-6">
      <div
        ref={modalRef}
        className="bg-gray-900 rounded-lg w-full max-w-2xl mx-auto mt-16 overflow-hidden"
      >
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">
            {book?.title ?? "Book"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            Close
          </button>
        </div>

        <div className="p-4">
          <div className="text-sm text-gray-300">
            {book?.current_page ?? 0} / {book?.total_pages ?? "—"} pages
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs text-gray-300">
                How many pages read today
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  type="number"
                  min={0}
                  value={String(addPages)}
                  onChange={(e) => setAddPages(Number(e.target.value) || 0)}
                  className="w-full bg-gray-800 text-gray-100 px-2 py-1 rounded"
                />
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={busy}
                  className="px-3 py-1 bg-indigo-600 disabled:opacity-50 hover:bg-indigo-500 rounded text-sm"
                >
                  {busy ? "Adding..." : "Add"}
                </button>
              </div>
            </div>

            {(book?.total_pages ?? 0) === 0 && (
              <div>
                <label className="text-xs text-gray-300">Set total pages</label>
                <div className="mt-2 flex gap-2">
                  <input
                    type="number"
                    min={0}
                    value={newTotal === "" ? "" : String(newTotal)}
                    onChange={(e) =>
                      setNewTotal(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    className="w-full bg-gray-800 text-gray-100 px-2 py-1 rounded"
                  />
                  <button
                    type="button"
                    onClick={handleUpdateTotal}
                    disabled={busy}
                    className="px-3 py-1 bg-emerald-600 disabled:opacity-50 hover:bg-emerald-500 rounded text-sm"
                  >
                    {busy ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-gray-800 flex items-center justify-between">
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className={`px-3 py-1 rounded text-sm ${
                  confirmDelete
                    ? "bg-red-600 hover:bg-red-500"
                    : "bg-gray-800 hover:bg-gray-700"
                }`}
              >
                {confirmDelete ? "Confirm delete" : "Delete"}
              </button>

              <button
                onClick={onClose}
                className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
