from __future__ import annotations

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, date

# ===========================================
# BOOK MODELS
# ===========================================


# Model for adding book to library
class BookAdd(BaseModel):
    book_id: str = Field(..., description="Google Books ID")
    title: str = Field(..., description="Book title")
    authors: List[str] = Field(..., description="Book authors")
    thumbnail: Optional[str] = Field(None, description="Book cover URL")
    pageCount: Optional[int] = Field(0, description="Total pages")


# Model for book in user's library
class UserBook(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")  # Changed from PyObjectId
    user_id: str = Field(..., description="User ID")  # Changed from PyObjectId
    book_id: str = Field(..., description="Google Books ID")
    current_page: int = Field(0, description="Current reading page")
    status: str = Field(
        "reading", description="Reading status: reading|completed|abandoned|paused"
    )
    start_date: Optional[datetime] = Field(
        None, description="When user started reading (first log date)"
    )
    last_read_date: Optional[datetime] = Field(
        None, description="Last reading date (set when first log is created)"
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {"validate_by_name": True}  # Without arbitrary_types_allowed


# ===========================================
# READING LOG MODELS
# ===========================================


# Model for creating reading log
class ReadingLogCreate(BaseModel):
    pages_read: int = Field(..., gt=0, description="Pages read in this session")
    current_page: int = Field(..., ge=0, description="Current page after reading")
    reading_time_minutes: Optional[int] = Field(
        None, description="Reading time in minutes"
    )
    notes: Optional[str] = Field("", description="Reading notes")


# Model for reading log in DB
class ReadingLog(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str = Field(..., description="User ID")
    book_id: str = Field(..., description="Google Books ID")
    reading_date: date = Field(..., description="Reading date")
    pages_read: int = Field(..., description="Pages read")
    notes: Optional[str] = Field("", description="Reading notes")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {"validate_by_name": True}  # Without arbitrary_types_allowed


# ===========================================
# BOOK SEARCH MODELS
# ===========================================


# Model for individual search result
class BookSearchResult(BaseModel):
    id: str = Field(..., description="Google Books ID")
    title: str = Field(..., description="Book title")
    authors: List[str] = Field(..., description="Book authors")
    publishedDate: str = Field("", description="Publication date")
    description: str = Field("", description="Book description")
    thumbnail: Optional[str] = Field(None, description="Cover image URL")
    pageCount: int = Field(0, description="Total pages")
    categories: List[str] = Field(default_factory=list, description="Book categories")
    infoLink: str = Field("", description="Google Books link")


# Model for complete search response
class BookSearchResponse(BaseModel):
    totalItems: int = Field(..., description="Total items found")
    books: List[BookSearchResult] = Field(..., description="List of books")
    query: str = Field(..., description="Search query used")


# ===========================================
# GENERAL BOOK MODELS
# ===========================================


# Model for general book information (from Google Books API)
class Book(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")  # Google Books ID
    google_id: str = Field(..., description="Google Books ID")
    title: str = Field(..., description="Book title")
    authors: List[str] = Field(..., description="Book authors")
    published_date: str = Field("", description="Publication date")
    publisher: str = Field("", description="Publisher")
    description: str = Field("", description="Book description")
    thumbnail: Optional[str] = Field(None, description="Cover image URL")
    page_count: int = Field(0, description="Total pages")
    categories: List[str] = Field(default_factory=list, description="Book categories")
    info_link: str = Field("", description="Google Books link")
    isbn: str = Field("", description="ISBN identifier")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {"validate_by_name": True}
