import React, { useState } from "react";
import BookEditModal from "./modals/BookEditModal";

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
  [k: string]: any;
}

interface BookCardProps {
  book?: Book;
  isNewBook?: boolean;
  onAdd?: () => void;
}

const BookCard: React.FC<BookCardProps> = ({
  book,
  isNewBook = false,
  onAdd,
}) => {
  const title = book?.title ?? "Unknown Book";
  const coverUrl = book?.thumbnail;
  const totalPages = book?.total_pages ?? 0;
  const currentPage = book?.current_page ?? 0;
  const lastReadDate = book?.last_read_date ?? undefined;
  const bookId = book?._id ?? book?.book_id;

  const progressPercent =
    book?.progress_percentage ??
    (totalPages > 0 ? Math.min((currentPage / totalPages) * 100, 100) : 0);

  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleOpenAdd = () => {
    if (onAdd) return onAdd();
  };

  const openEdit = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsEditOpen(true);
  };
  const closeEdit = () => setIsEditOpen(false);

  return (
    <div
      {...(bookId ? { "data-book-id": bookId } : {})}
      className={`book-card flex flex-col w-[150px] h-[230px] overflow-visible rounded-md shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer ${
        isEditOpen ? "scale-105" : ""
      }`}
    >
      {isNewBook ? (
        <button
          className="relative bg-[#3B3B3B] flex items-center justify-center w-full flex-1 rounded-md"
          onClick={handleOpenAdd}
        >
          <div
            aria-label="Add new book"
            className="flex flex-col items-center justify-center w-full h-full"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#707070] hover:bg-slate-500 transition-colors">
              <svg
                className="w-10 h-10 text-[#E0E0E0]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <p className="mt-3 text-sm font-medium text-[#E0E0E0]">Add book</p>
          </div>
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={openEdit}
            className="relative w-full flex-1 focus:outline-none"
            aria-label={`Open actions for ${title}`}
          >
            {coverUrl ? (
              <div className="w-full h-full rounded-md overflow-hidden">
                <img
                  src={coverUrl}
                  alt={`Cover of ${title}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-full h-full rounded-t-lg bg-gray-700 flex items-center justify-center overflow-hidden">
                <div className="text-center text-[#a8a8a9]">
                  <div className="w-16 h-16 mx-auto mb-2 bg-gray-600 rounded" />
                  <p className="text-sm">No cover</p>
                </div>
              </div>
            )}

            <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-4">
              <div className="min-w-[50px] flex justify-center text-sm font-semibold bg-surface-medium text-secondary border border-border-default/[0.6] px-3 py-1 rounded-md shadow-lg">
                {Math.round(progressPercent)}%
              </div>
            </div>
          </button>

          <BookEditModal open={isEditOpen} onClose={closeEdit} book={book} />
        </>
      )}
    </div>
  );
};

export default BookCard;
