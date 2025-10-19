import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import apiRoutes from "../../../../public/apis/apiRoutes";
import { authFetch } from "../../../../public/auth/auth";
import BookLogsHistory from "./BookLogsHistory";
import BookDetails from "./BookDetails";
import LogEntryForm from "./LogEntryForm";

type Book = Record<string, any>;

interface Props {
  open: boolean;
  onClose: () => void;
  book?: Book;
}

export default function BookEditModal({ open, onClose, book }: Props) {
  const handleCloseClick = () => {
    window.dispatchEvent(new CustomEvent("bookUpdated"));
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
  }, [open, book?.book_id]);

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

      await loadFullBookData();
      await loadUserLogs();

      setLogValue(1);
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
      console.log(book);
      // Call API to modify the book total pages
      await authFetch(apiRoutes.books.library.modify, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          book_google_id: book?.book_id?.toString() ?? "",
          book_id: book?._id?.toString() ?? "",
          total_pages: t,
        }),
      }).then(async (res) => {
        if (!res.ok) throw new Error("Failed to update book total");

        await loadFullBookData();
        await loadUserLogs();
      });
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
    <div className="fixed inset-0 bg-bg-base/50 flex items-start justify-center z-50 p-6">
      <div
        ref={modalRef}
        className="bg-surface-medium border-border-strong border rounded-xl w-full max-w-2xl mx-auto mt-16 overflow-hidden shadow-lg"
      >
        <div className="p-4 border-b border-border-strong flex justify-between items-center">
          <h3 className="text-lg font-semibold text-highlight">
            {fullBookData?.title ?? book?.title ?? "Book"}
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className={`inline-flex items-center gap-2 px-2 py-1 rounded text-sm ${
                confirmDelete
                  ? "bg-danger hover:bg-danger/90 text-highlight"
                  : "bg-surface-low hover:bg-surface-medium text-secondary"
              }`}
              aria-label={confirmDelete ? "Confirm delete book" : "Delete book"}
              title={confirmDelete ? "Confirm delete" : "Delete"}
            >
              {confirmDelete ? (
                <span className="text-sm font-medium">Confirm</span>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="w-4 h-4"
                  aria-hidden="true"
                >
                  <path
                    fill="currentColor"
                    d="M9 3v1H4v2h16V4h-5V3H9zm1 5v9h2V8h-2zm4 0v9h2V8h-2zM7 8v9h2V8H7z"
                  />
                </svg>
              )}
            </button>

            <button
              onClick={() => {
                setConfirmDelete(false);
                handleCloseClick();
              }}
              className="text-secondary hover:text-highlight p-2 rounded focus:outline-none focus:ring-2 focus:ring-accent/50"
              aria-label="Close modal"
              title="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="w-5 h-5"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M18.3 5.71a1 1 0 00-1.41 0L12 10.59 7.11 5.7A1 1 0 105.7 7.11L10.59 12l-4.89 4.89a1 1 0 101.41 1.41L12 13.41l4.89 4.89a1 1 0 001.41-1.41L13.41 12l4.89-4.89a1 1 0 000-1.4z"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-4">
          <BookDetails
            fullBookData={fullBookData}
            book={book}
            newTotal={newTotal}
            setNewTotal={(v: number | "") => setNewTotal(v)}
            onSaveTotal={handleUpdateTotal}
            busy={busy}
          />

          <div className="mt-4 space-y-3">
            {/* Add Log */}
            <LogEntryForm
              logDate={logDate}
              setLogDate={setLogDate}
              logValue={logValue}
              setLogValue={setLogValue}
              onAdd={handleAdd}
              busy={busy}
            />
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
