import { useState, useEffect } from "react";
import apiRoutes from "../../../../public/apis/apiRoutes";
import { authFetch } from "../../../../public/auth/auth";

interface Props {
  fullBookData?: any;
  book?: any;
  // optional controls to set total pages when it's missing (0)
  newTotal?: number | "";
  setNewTotal?: (v: number | "") => void;
  onSaveTotal?: () => void;
  busy?: boolean;
}

export default function BookDetails({
  fullBookData,
  book,
  newTotal,
  setNewTotal,
  onSaveTotal,
  busy,
}: Props) {
  const title = fullBookData?.title ?? book?.title ?? "Untitled";
  const authors = Array.isArray(fullBookData?.authors)
    ? fullBookData.authors.join(", ")
    : fullBookData?.author ?? book?.author ?? "Unknown author";
  const description =
    fullBookData?.description ??
    book?.description ??
    "No description available.";
  const thumbnail = fullBookData?.thumbnail ?? book?.thumbnail;

  const current = Number(fullBookData?.current_page ?? book?.current_page ?? 0);
  const total = Number(fullBookData?.total_pages ?? book?.total_pages ?? 0);
  const progress =
    total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  const [showMore, setShowMore] = useState(false);
  const [marking, setMarking] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [popoverActive, setPopoverActive] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const showToastMessage = (
    message: string,
    type: "success" | "error" | "info" = "info"
  ) => {
    setToast({ message, type });
    // auto-dismiss
    window.setTimeout(() => setToast(null), 3500);
  };

  // Show a non-blocking confirm UI (instead of window.confirm)
  const handleMarkComplete = () => {
    setShowConfirm(true);
  };

  useEffect(() => {
    let t: number | undefined;
    if (showConfirm) {
      // start hidden, then trigger scale-in for a smooth animation
      setPopoverActive(false);
      t = window.setTimeout(() => setPopoverActive(true), 10);
    } else {
      setPopoverActive(false);
    }
    return () => {
      if (t) window.clearTimeout(t);
    };
  }, [showConfirm]);

  const confirmMarkComplete = async () => {
    const bookId =
      book?.book_id ?? fullBookData?.google_id ?? fullBookData?.id ?? "";
    if (!bookId) {
      showToastMessage("Unable to determine book id", "error");
      setShowConfirm(false);
      return;
    }

    try {
      setMarking(true);
      const res = await authFetch(apiRoutes.books.library.modifyComplete, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ book_id: bookId }),
      });
      if (!res.ok) throw new Error("Failed to mark book as completed");
      // notify rest of app to refresh
      window.dispatchEvent(new CustomEvent("bookUpdated"));
      showToastMessage("Book marked as completed", "success");
      setShowConfirm(false);
    } catch (err) {
      console.error(err);
      showToastMessage(
        "Could not mark book as completed. Check console.",
        "error"
      );
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className="mt-4 flex gap-4 items-start bg-surface-high p-3 rounded-lg">
      <div className="fixed top-4 right-4 z-50">
        {toast && (
          <div
            role="status"
            aria-live="polite"
            className={`min-w-[200px] px-3 py-2 rounded shadow-lg text-sm font-medium ${
              toast.type === "success"
                ? "bg-success text-highlight"
                : toast.type === "error"
                ? "bg-[color:var(--color-error)] text-white"
                : "bg-surface-medium text-primary"
            }`}
          >
            {toast.message}
          </div>
        )}
      </div>
      <div className="flex flex-col items-start flex-shrink-0">
        <div className="relative overflow-visible w-[150px] h-[230px] bg-surface-low rounded-lg shadow-sm border-border-strong border-2">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={title}
              className="w-full h-full object-cover rounded-[6px]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-secondary text-xs">
              No image
            </div>
          )}
          <div className="absolute left-1/2 -bottom-4 transform -translate-x-1/2">
            <div className="min-w-[50px] flex justify-center text-sm font-semibold bg-surface-medium text-secondary border border-border-default/[0.6] px-3 py-1 rounded-md shadow-lg">
              {progress}%
            </div>
          </div>
        </div>

        {/* progress bar under the image */}
        <div className="mt-6 w-[150px]">
          <div className="bg-surface-low rounded-full h-2 overflow-hidden">
            <div
              className="h-2 bg-gradient-to-r from-accent-base to-accent-hover shadow-sm transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-2 w-[150px] text-center text-xs text-secondary">
            {total > 0 ? (
              <div className="flex items-center justify-center gap-2">
                <span className="leading-tight">
                  {current} / {total}
                </span>
                <span className="text-[11px]">pages</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span className="leading-tight">{current} /</span>
                {/* inline numeric input (smaller) */}
                <input
                  type="number"
                  min={0}
                  value={newTotal === "" ? "" : String(newTotal)}
                  onChange={(e) =>
                    setNewTotal &&
                    setNewTotal(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  className="inline-block align-text-bottom w-12 px-1 py-0.5 rounded-sm bg-input-bg text-primary border border-input-border placeholder-input-placeholder focus:outline-none focus:ring-1 focus:ring-accent/60 focus:border-input-focus-border text-xs"
                  aria-label="Set total pages"
                />
                <span className="text-[11px]">pages</span>
              </div>
            )}
          </div>

          {/* Save button below the input */}
          {total === 0 && typeof onSaveTotal === "function" && (
            <div className="mt-2 flex justify-center">
              <button
                type="button"
                onClick={onSaveTotal}
                disabled={busy}
                className="w-12 px-2 py-0.5 bg-success disabled:opacity-50 hover:bg-success/90 rounded-sm text-xs text-highlight text-center"
                aria-label="Save new total pages"
                title="Save new total pages"
              >
                {busy ? "Saving..." : "Save"}
              </button>
            </div>
          )}

          {/* Mark as completed button when total is known */}
          {total > 0 && (
            <div className="mt-2 flex justify-center">
              <button
                type="button"
                onClick={handleMarkComplete}
                disabled={marking}
                className="px-3 py-1 bg-accent-base text-highlight rounded text-sm hover:bg-accent-hover focus:outline-none focus:ring-1 focus:ring-accent/60 disabled:opacity-50"
                aria-label="Mark book as completed"
                title="Mark book as completed"
              >
                {marking ? "Marking..." : "Mark as completed"}
              </button>
            </div>
          )}

          {/* Popover confirmation (anchored, doesn't shift layout) */}
          {showConfirm && (
            <div className="relative">
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-40 origin-left">
                <div
                  className={`w-[220px] px-3 py-2 rounded-md shadow-md flex flex-col gap-2 border border-border-default bg-surface-low transform transition-all duration-300 ease-in-out ${
                    popoverActive
                      ? "scale-100 opacity-100"
                      : "scale-0 opacity-0"
                  }`}
                >
                  <div className="text-sm text-primary">
                    Mark this book as completed?
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      className="px-3 py-1 bg-accent-base text-highlight rounded text-sm hover:bg-accent-hover disabled:opacity-50"
                      onClick={confirmMarkComplete}
                      disabled={marking}
                    >
                      {marking ? "Marking..." : "Yes"}
                    </button>
                    <button
                      className="px-3 py-1 bg-surface-medium text-primary rounded text-sm hover:bg-surface-high"
                      onClick={() => setShowConfirm(false)}
                      disabled={marking}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1">
        <h4 className="text-lg font-semibold text-highlight">{title}</h4>
        <div className="text-sm text-secondary mt-1">{authors}</div>

        <p
          className={`mt-2 text-sm text-secondary ${
            showMore ? "" : "max-h-20 overflow-hidden"
          }`}
        >
          {description}
        </p>
        {description && description.length > 220 && (
          <button
            className="mt-2 text-xs text-accent-hover hover:underline"
            onClick={() => setShowMore((s) => !s)}
          >
            {showMore ? "Show less" : "Show more"}
          </button>
        )}
      </div>
    </div>
  );
}
