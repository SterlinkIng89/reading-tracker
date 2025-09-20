import { useState } from "react";
import apiRoutes from "../../../../public/apis/apiRoutes";
import { authFetch } from "../../../../public/auth/auth";

interface Log {
  _id: string;
  reading_date: string;
  pages_read: number;
  current_page: number;
  notes?: string;
}

interface Book {
  _id?: string;
  current_page?: number;
}

interface Props {
  logs: Log[] | null;
  book: Book | undefined;
  onLogsUpdate?: () => void;
}

export default function BookLogsHistory({ logs, book, onLogsUpdate }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{
    date: string;
    pages: number;
    checkpoint: number;
    originalDate: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!logs || logs.length === 0) {
    return (
      <div className="mt-4 text-xs text-gray-400">
        No reading logs available for this book.
      </div>
    );
  }

  const startEdit = (log: Log) => {
    setEditingId(log._id);
    setEditData({
      date: new Date(log.reading_date).toISOString().split("T")[0], // YYYY-MM-DD
      pages: log.pages_read,
      checkpoint: log.current_page ?? 0,
      originalDate: log.reading_date,
    });
    setDeletingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData(null);
    setDeletingId(null);
  };

  const startDelete = (logId: string) => {
    setDeletingId(logId);
    setEditingId(null);
    setEditData(null);
  };

  const cancelDelete = () => {
    setDeletingId(null);
  };

  const confirmDelete = async (log: Log) => {
    setSaving(true);
    try {
      await authFetch(apiRoutes.books.logs.remove, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          log_id: log._id,
        }),
      });
      // Refresh logs after successful deletion
      if (onLogsUpdate) {
        await onLogsUpdate();
      }
      // Emit event to update BooksList
      window.dispatchEvent(new CustomEvent("logUpdated"));
      setDeletingId(null);
      setEditingId(null);
      setEditData(null);
    } catch (error) {
      console.error("Error deleting log:", error);
      alert("Failed to delete log. Check console.");
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editData || !editingId) return;
    setSaving(true);
    try {
      await authFetch(apiRoutes.books.logs.modify, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          book_id: book?._id,
          original_date: editData.originalDate,
          reading_date: editData.date,
          pages_read: editData.pages,
          current_page: editData.checkpoint,
          notes: "",
        }),
      });
      // Refresh logs after successful edit
      if (onLogsUpdate) {
        await onLogsUpdate();
      }
      // Emit event to update BooksList
      window.dispatchEvent(new CustomEvent("logUpdated"));
      cancelEdit();
    } catch (error) {
      console.error("Error updating log:", error);
      alert("Failed to update log. Check console.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold text-white mb-2">Logs</h4>
      <hr className="border-gray-700 mb-3" />
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {logs.map((log) => (
          <div
            key={log._id}
            className="text-md text-gray-300 bg-gray-800 p-2 rounded"
          >
            {editingId === log._id ? (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={editData?.date || ""}
                    onChange={(e) =>
                      setEditData((prev) =>
                        prev ? { ...prev, date: e.target.value } : null
                      )
                    }
                    className="bg-gray-700 text-gray-100 px-2 py-1 rounded text-sm w-32"
                  />
                  <span className="text-gray-400 text-sm">Read</span>
                  <input
                    type="number"
                    min={0}
                    value={editData?.pages || 0}
                    onChange={(e) =>
                      setEditData((prev) =>
                        prev ? { ...prev, pages: Number(e.target.value) } : null
                      )
                    }
                    className="bg-gray-700 text-gray-100 px-2 py-1 rounded text-sm w-20"
                  />
                  <span className="text-gray-400 text-sm">pages until</span>
                  <input
                    type="number"
                    min={0}
                    value={editData?.checkpoint || 0}
                    onChange={(e) =>
                      setEditData((prev) =>
                        prev
                          ? { ...prev, checkpoint: Number(e.target.value) }
                          : null
                      )
                    }
                    className="bg-gray-700 text-gray-100 px-2 py-1 rounded text-sm w-20"
                  />
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={() => startDelete(log._id)}
                    className="px-2 py-1 bg-red-600 hover:bg-red-500 rounded text-xs"
                  >
                    Erase
                  </button>
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    className="px-2 py-1 bg-green-600 hover:bg-green-500 rounded text-xs"
                  >
                    {saving ? "..." : "✓"}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center">
                  <span>
                    {new Date(log.reading_date).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}{" "}
                    - Read {log.pages_read} pages until page{" "}
                    {log.current_page ?? "N/A"}
                  </span>
                  <div className="flex gap-1">
                    {deletingId === log._id ? (
                      <>
                        <button
                          onClick={() => confirmDelete(log)}
                          disabled={saving}
                          className="px-2 py-1 bg-red-600 hover:bg-red-500 rounded text-xs"
                        >
                          {saving ? "..." : "✓"}
                        </button>
                        <button
                          onClick={cancelDelete}
                          className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => startEdit(log)}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
                {log.notes && (
                  <div className="text-gray-500 italic mt-1">
                    Notes: {log.notes}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
