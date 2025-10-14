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
      <div className="col-span-full text-center text-gray-400 py-8">
        Loading books...
      </div>
    );
  }

  if (error) {
    return (
      <div className="col-span-full text-center text-red-400 py-8">{error}</div>
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
