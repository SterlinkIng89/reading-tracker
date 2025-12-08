import React, { useState, useEffect, useMemo } from "react";
import BookCard from "./BookCard";
import AddBookModal from "./modals/AddBookModal";
import { authFetch } from "../../../public/auth/auth";
import apiRoutes from "../../../public/apis/apiRoutes";

interface Book {
  _id: string;
  book_id: string;
  title: string;
  authors: string[];
  thumbnail?: string;
  total_pages: number;
  current_page: number;
  progress_percentage: number;
  status: "reading" | "completed" | "abandoned";
  last_read_date?: string;
}

const BooksList: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserBooks();
  }, []);

  useEffect(() => {
    const handleBookAdded = () => loadUserBooks();
    const handleBookRemoved = () => loadUserBooks();
    // Only reload on major changes, not on log updates while modal is open
    const handleBookUpdated = () => {
      // Only reload if it's a completion or major update
      loadUserBooks();
    };

    window.addEventListener("bookAdded", handleBookAdded);
    window.addEventListener("bookRemoved", handleBookRemoved);
    window.addEventListener("bookUpdated", handleBookUpdated);

    return () => {
      window.removeEventListener("bookAdded", handleBookAdded);
      window.removeEventListener("bookRemoved", handleBookRemoved);
      window.removeEventListener("bookUpdated", handleBookUpdated);
    };
  }, []);

  // listen for external sort changes (dispatched from a parent toolbar)
  useEffect(() => {
    // previously we listened for external sort events; header is internal now
    return () => { };
  }, []);

  const loadUserBooks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authFetch(apiRoutes.books.library.get);
      if (!response.ok) throw new Error("Failed to load books");

      const data = await response.json();
      setBooks(data.books || []);
    } catch (error) {
      console.error("Error loading books:", error);
      setError("Failed to load books. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBookClick = (book: Book) => {
    const bookData = {
      id: book.book_id,
      title: book.title,
      author: book.authors?.join(", ") || "Unknown Author",
      currentPage: book.current_page,
      totalPages: book.total_pages,
    };

    // Open reading logger modal
    if ((window as any).openReadingLogger) {
      (window as any).openReadingLogger(bookData);
    }
  };

  const [showAddModal, setShowAddModal] = React.useState(false);
  const openAddModal = () => setShowAddModal(true);
  const closeAddModal = () => setShowAddModal(false);

  // sorting state: alphabetical and progress
  const [sortMode, setSortMode] = useState<
    "alpha-asc" | "alpha-desc" | "progress-desc" | "progress-asc"
  >("alpha-asc");

  const sortedBooks = useMemo(() => {
    const copy = [...books];
    switch (sortMode) {
      case "alpha-asc":
        return copy.sort((a, b) =>
          (a.title || "").localeCompare(b.title || "")
        );
      case "alpha-desc":
        return copy.sort((a, b) =>
          (b.title || "").localeCompare(a.title || "")
        );
      case "progress-desc":
        return copy.sort((a, b) => {
          const pa = a.progress_percentage ?? 0;
          const pb = b.progress_percentage ?? 0;
          if (pb !== pa) return pb - pa;
          return (a.title || "").localeCompare(b.title || "");
        });
      case "progress-asc":
        return copy.sort((a, b) => {
          const pa = a.progress_percentage ?? 0;
          const pb = b.progress_percentage ?? 0;
          if (pa !== pb) return pa - pb;
          return (a.title || "").localeCompare(b.title || "");
        });
      default:
        return copy;
    }
  }, [books, sortMode]);

  if (loading) {
    return (
      <div className="col-span-full py-6">
        <div className="flex flex-wrap gap-5 gap-y-7">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex-shrink-0">
              <div className="w-[150px] h-[230px] bg-surface-low rounded-md p-2 animate-pulse">
                <div className="w-full h-[150px] bg-surface-medium rounded mb-3" />
                <div className="h-4 bg-surface-medium rounded w-3/4 mb-2" />
                <div className="h-3 bg-surface-medium rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="col-span-full py-6">
        <div className="mx-auto max-w-xl bg-surface-medium border border-border-default rounded-lg p-4 text-center">
          <div className="text-sm text-danger font-semibold mb-2">
            Failed to load books
          </div>
          <div className="text-xs text-secondary mb-4">{error}</div>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => loadUserBooks()}
              className="px-3 py-1 bg-accent-base text-highlight rounded text-sm hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent/60"
            >
              Retry
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1 bg-success text-highlight rounded text-sm hover:bg-success/90 focus:outline-none focus:ring-2 focus:ring-accent/60"
            >
              Add a book
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4">
        <div className="max-w-4xl w-full flex items-baseline gap-4">
          <h3 className="text-2xl font-bold text-white leading-tight">
            My collection
          </h3>

          <div>
            <select
              id="sort-select"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as any)}
              className="text-sm bg-input-bg border border-input-border text-primary px-3 py-1 h-8 rounded focus:outline-none focus:ring-1 focus:ring-accent/60"
            >
              <option value="alpha-asc">Alphabetical (A → Z)</option>
              <option value="alpha-desc">Alphabetical (Z → A)</option>
              <option value="progress-desc">Progress (High → Low)</option>
              <option value="progress-asc">Progress (Low → High)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-5 gap-y-7">
        <div key="add-new" className="flex-shrink-0 w-[150px] h-[230px]">
          <BookCard isNewBook onAdd={openAddModal} />
        </div>

        {sortedBooks.map((book) => (
          <div
            key={book.book_id}
            className="flex-shrink-0 w-[150px] h-[230px]"
            onClick={() => handleBookClick(book)}
          >
            <BookCard book={book} />
          </div>
        ))}
      </div>

      <AddBookModal open={showAddModal} onClose={closeAddModal} />
    </>
  );
};

export default BooksList;
