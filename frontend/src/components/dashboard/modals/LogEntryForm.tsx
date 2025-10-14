import React from "react";

interface Props {
  logDate: string;
  setLogDate: (v: string) => void;
  logValue: number;
  setLogValue: (n: number) => void;
  onAdd: () => Promise<void> | void;
  busy?: boolean;
}

export default function LogEntryForm({
  logDate,
  setLogDate,
  logValue,
  setLogValue,
  onAdd,
  busy = false,
}: Props) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAdd();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-3 w-full bg-surface-high px-3 py-2 rounded-lg"
    >
      <label htmlFor="logDate" className="sr-only">
        Reading date
      </label>
      <input
        id="logDate"
        name="logDate"
        type="date"
        value={logDate}
        onChange={(e) => setLogDate(e.target.value)}
        className="w-36 px-2 py-1 rounded bg-input-bg text-primary border border-input-border placeholder-input-placeholder focus:outline-none focus:ring-1 focus:ring-accent/60 focus:border-input-focus-border transition-shadow duration-200"
        aria-label="Reading date"
      />

      <label htmlFor="logPages" className="sr-only">
        Pages read
      </label>
      <input
        id="logPages"
        name="logPages"
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        value={String(logValue)}
        onChange={(e) => setLogValue(Number(e.target.value) || 0)}
        className="w-20 px-2 py-1 rounded bg-input-bg text-primary border border-input-border placeholder-input-placeholder text-center focus:outline-none focus:ring-1 focus:ring-accent/60 focus:border-input-focus-border transition-shadow duration-200"
        aria-label="Pages read"
      />

      <div className="text-sm text-secondary truncate" aria-live="polite">
        {(() => {
          const date = new Date(logDate);
          const dateStr = date.toLocaleDateString("en-US", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
          return `${dateStr} · ${logValue} pages`;
        })()}
      </div>

      <button
        type="submit"
        disabled={busy}
        aria-disabled={busy}
        aria-busy={busy}
        className="ml-auto inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-base to-accent-dark disabled:opacity-50 hover:scale-105 transform transition-all duration-150 rounded-lg text-sm text-highlight font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/60"
      >
        {busy ? (
          <>
            <svg
              className="w-4 h-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            <span className="sr-only">Adding</span>
          </>
        ) : null}
        <span>{busy ? "Adding..." : "Add"}</span>
      </button>
    </form>
  );
}
