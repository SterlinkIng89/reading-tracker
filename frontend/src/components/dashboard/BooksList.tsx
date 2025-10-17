import React, { useState, useEffect } from "react";
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
    const handleBookUpdated = () => {
      loadUserBooks();
    };
    const handleLogAdded = () => {
      loadUserBooks();
    };
    const handleLogUpdated = () => {
      loadUserBooks();
    };

    window.addEventListener("bookAdded", handleBookAdded);
    window.addEventListener("bookRemoved", handleBookRemoved);
    window.addEventListener("bookUpdated", handleBookUpdated);
    window.addEventListener("logAdded", handleLogAdded);
    window.addEventListener("logUpdated", handleLogUpdated);

    return () => {
      window.removeEventListener("bookAdded", handleBookAdded);
      window.removeEventListener("bookRemoved", handleBookRemoved);
      window.removeEventListener("bookUpdated", handleBookUpdated);
      window.removeEventListener("logAdded", handleLogAdded);
      window.removeEventListener("logUpdated", handleLogUpdated);
    };
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
          <div className="text-sm text-danger font-semibold mb-2">Failed to load books</div>
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

  console.log(books);

  return (
    <>
      <div className="flex flex-wrap gap-5 gap-y-7">
        <div key="add-new" className="flex-shrink-0">
          <BookCard isNewBook onAdd={openAddModal} />
        </div>

        {books.map((book) => (
          <div
            key={book.book_id}
            className="flex-shrink-0"
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
