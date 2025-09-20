import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import apiRoutes, { API_BASE } from "../../../../public/apis/apiRoutes";
import { authFetch } from "../../../../public/auth/auth";
import BookLogsHistory from "./BookLogsHistory";

type Book = Record<string, any>;

interface Props {
  open: boolean;
  onClose: () => void;
  book?: Book;
}

export default function BookEditModal({ open, onClose, book }: Props) {
  const handleCloseClick = () => {
    onClose();
  };
  const [addPages, setAddPages] = useState<number>(1);
  const [newTotal, setNewTotal] = useState<number | "">(
    book?.total_pages ?? ""
  );
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [logDate, setLogDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [logValue, setLogValue] = useState<number>(1);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogDate(e.target.value);
  };

  const modalRef = useRef<HTMLDivElement | null>(null);
  const startedOutsideRef = useRef(false);

  const [loadingLogs, setLoadingLogs] = useState(true);
  const [errorLogs, setErrorLogs] = useState<string | null>(null);
  const [booksLogs, setBooksLogs] = useState(null);
  const [fullBookData, setFullBookData] = useState<any>(null);
  const [loadingBook, setLoadingBook] = useState(false);

  useEffect(() => {
    if (open && book?.book_id) {
      loadFullBookData();
      loadUserLogs();
      setAddPages(1);
      setNewTotal(book?.total_pages ?? "");
      setBusy(false);
      setConfirmDelete(false);
      setLogDate(new Date().toISOString().split("T")[0]);
      setLogValue(1);
    }
  }, [open, book?.book_id]); // Changed dependency to be more specific

  useEffect(() => {
    const handleBookUpdate = () => {
      if (open && book?.book_id) {
        loadFullBookData();
        loadUserLogs();
      }
    };

    if (open) {
      window.addEventListener("bookUpdated", handleBookUpdate);
      return () => window.removeEventListener("bookUpdated", handleBookUpdate);
    }
  }, [open, book?.book_id]); // Simplified dependencies

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

  const book_id = book?._id;
  const google_id = book?.book_id;

  async function handleAdd() {
    const value = Math.max(0, Math.floor(logValue || 0));
    if (value <= 0) return;
    setBusy(true);
    try {
      const current = Number(
        fullBookData?.current_page ?? book?.current_page ?? 0
      );
      const pages_read = value;
      const current_page = current + value;

      await authFetch(
        `${apiRoutes.books.logs.add}?book_id=${encodeURIComponent(book_id)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            book_id: google_id,
            pages_read,
            current_page,
            notes: "",
            reading_date: logDate,
          }),
        }
      );

      // Refresh data after adding log
      await loadFullBookData();
      await loadUserLogs();
      window.dispatchEvent(new CustomEvent("logAdded"));

      // Reset form
      setLogValue(1);
      setLogDate(new Date().toISOString().split("T")[0]);
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
      // Note: This function seems incomplete in the original code
      // You might need to implement the actual API call to update total pages
      window.dispatchEvent(new CustomEvent("bookUpdated"));

      // Refresh data
      await loadFullBookData();
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
      await authFetch(`${apiRoutes.books.library.remove}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          book_id: book?.book_id.toString() ?? "",
        }),
      });
      window.dispatchEvent(new CustomEvent("bookRemoved"));
      onClose(); // Close modal after deleting the book
    } catch (err) {
      console.error("Delete book error", err);
      alert("Could not delete book. Check console.");
    } finally {
      setBusy(false);
    }
  }

  const loadUserLogs = async () => {
    if (!book?.book_id) return;

    try {
      setLoadingLogs(true);
      setErrorLogs(null);

      const response = await authFetch(
        `${apiRoutes.books.logs.get}?book_id=${encodeURIComponent(
          book.book_id
        )}`
      );

      if (!response.ok) throw new Error("Failed to load book logs");

      const data = await response.json();
      setBooksLogs(data.logs || []);
    } catch (error) {
      console.error("Error loading book logs:", error);
      setErrorLogs("Failed to load book logs. Please try again.");
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadFullBookData = async () => {
    if (!book?.book_id) {
      return;
    }

    try {
      setLoadingBook(true);
      const response = await authFetch(
        `${apiRoutes.books.library.getBook}?book_id=${encodeURIComponent(
          book.book_id
        )}`
      );

      if (!response.ok) throw new Error("Failed to load book details");

      const data = await response.json();
      setFullBookData(data);
    } catch (error) {
      console.error("Error loading book details:", error);
    } finally {
      setLoadingBook(false);
    }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-start justify-center z-50 p-6">
      <div
        ref={modalRef}
        className="bg-gray-900 rounded-lg w-full max-w-2xl mx-auto mt-16 overflow-hidden"
      >
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">
            {fullBookData?.title ?? book?.title ?? "Book"}
          </h3>
          <button
            onClick={handleCloseClick}
            className="text-gray-400 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="p-4">
          <div className="text-sm text-gray-300">
            {fullBookData?.current_page ?? book?.current_page ?? 0} /{" "}
            {fullBookData?.total_pages ?? book?.total_pages ?? "—"} pages
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <div className="flex gap-2 mb-2">
                <input
                  type="date"
                  value={logDate}
                  onChange={handleDateChange}
                  className="bg-gray-800 text-gray-100 px-2 py-1 rounded"
                />
                <input
                  type="number"
                  min={0}
                  value={String(logValue)}
                  onChange={(e) => setLogValue(Number(e.target.value) || 0)}
                  className="w-full bg-gray-800 text-gray-100 px-2 py-1 rounded"
                />
              </div>
              <div className="text-sm text-gray-300 mb-2">
                {(() => {
                  const date = new Date(logDate);
                  const dateStr = date.toLocaleDateString("es-MX", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  });
                  return `${dateStr} I read ${logValue} pages`;
                })()}
              </div>
              <button
                type="button"
                onClick={handleAdd}
                disabled={busy}
                className="px-3 py-1 bg-indigo-600 disabled:opacity-50 hover:bg-indigo-500 rounded text-sm"
              >
                {busy ? "Adding..." : "Add"}
              </button>
            </div>

            {(fullBookData?.total_pages ?? book?.total_pages ?? 0) === 0 && (
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
                onClick={handleCloseClick}
                className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm"
              >
                Close
              </button>
            </div>
          </div>

          <BookLogsHistory
            logs={booksLogs}
            book={fullBookData ?? book}
            onLogsUpdate={async () => {
              await loadFullBookData();
              await loadUserLogs();
            }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
