from fastapi import APIRouter, HTTPException, Query, Depends, Body

from bson import ObjectId
from datetime import datetime, date

import httpx
from app.settings import settings
from ..database.connection import (
    get_current_user,
    get_books_collection,
    get_user_books_collection,
    get_reading_logs_collection,
)
from ..database.models.book_models import Book

router = APIRouter(prefix="/books", tags=["books"])

GOOGLE_BOOKS_API_URL = "https://www.googleapis.com/books/v1/volumes"


@router.get("/search")
async def search_books(
    query: str = Query(..., description="Search query for books"),
    books_col=Depends(get_books_collection),
    current_user: dict = Depends(get_current_user),
):
    """
    Search for books using Google Books API.
    Example: /books/search?q=harry+potter
    """
    print("searchQuery", query)
    if not settings.GOOGLE_BOOKS_API_KEY:
        raise HTTPException(
            status_code=500, detail="Google Books API key not configured"
        )

    params = {
        "q": query,
        "key": settings.GOOGLE_BOOKS_API_KEY,
        "maxResults": 10,
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(GOOGLE_BOOKS_API_URL, params=params)
            response.raise_for_status()
            data = response.json()
        except httpx.HTTPError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error fetching from Google Books API: {str(e)}",
            )

    # Extract and clean book information
    books = []
    for item in data.get("items", []):
        volume_info = item.get("volumeInfo", {})

        # Get the best available image
        image_links = volume_info.get("imageLinks", {})
        thumbnail = (
            image_links.get("thumbnail", "").replace("http:", "https:")
            if image_links
            else None
        )

        # Extract ISBN from industry identifiers
        isbn = ""
        industry_identifiers = volume_info.get("industryIdentifiers", [])
        for identifier in industry_identifiers:
            if identifier.get("type") == "ISBN_13":
                isbn = identifier.get("identifier", "")
                break
            elif identifier.get("type") == "ISBN_10" and not isbn:
                isbn = identifier.get("identifier", "")

        book_data = {
            "google_id": item.get("id"),
            "title": volume_info.get("title", "Unknown Title"),
            "authors": volume_info.get("authors", ["Unknown Author"]),
            "published_date": volume_info.get("publishedDate", ""),
            "publisher": volume_info.get("publisher", ""),
            "description": (
                volume_info.get("description", "No description available")[:200] + "..."
                if volume_info.get("description")
                and len(volume_info.get("description")) > 200
                else volume_info.get("description", "No description available")
            ),
            "thumbnail": thumbnail,
            "page_count": volume_info.get("pageCount", 0),
            "categories": volume_info.get("categories", []),
            "info_link": volume_info.get("infoLink", ""),
            "isbn": isbn,
        }

        # Save book to database if not exists
        existing_book = await books_col.find_one({"google_id": book_data["google_id"]})
        if not existing_book:
            # Create a copy for database insertion (MongoDB might modify it)
            db_book_data = book_data.copy()
            await books_col.insert_one(db_book_data)

        # Create clean response data without MongoDB ObjectId
        response_book_data = {
            "id": book_data["google_id"],
            "google_id": book_data["google_id"],
            "title": book_data["title"],
            "authors": book_data["authors"],
            "published_date": book_data["published_date"],
            "publisher": book_data["publisher"],
            "description": book_data["description"],
            "thumbnail": book_data["thumbnail"],
            "page_count": book_data["page_count"],
            "categories": book_data["categories"],
            "info_link": book_data["info_link"],
            "isbn": book_data["isbn"],
        }
        books.append(response_book_data)

    return {"totalItems": data.get("totalItems", 0), "books": books, "query": query}


@router.post("/user/library/add")
async def add_book_to_user(
    book_data: dict = Body(...),
    books_col=Depends(get_books_collection),
    user_books_col=Depends(get_user_books_collection),
    current_user: dict = Depends(get_current_user),
):
    """Add a book to user's library"""
    try:
        # Ensure book exists in books collection, save if not
        book = await books_col.find_one({"google_id": book_data["id"]})
        if not book:
            # Save book to database first
            book_doc = {
                "google_id": book_data["id"],
                "title": book_data.get("title", "Unknown Title"),
                "authors": book_data.get("authors", ["Unknown Author"]),
                "published_date": book_data.get("published_date", ""),
                "publisher": book_data.get("publisher", ""),
                "description": book_data.get("description", "No description available"),
                "thumbnail": book_data.get("thumbnail"),
                "page_count": book_data.get("page_count", 0),
                "categories": book_data.get("categories", []),
                "info_link": book_data.get("info_link", ""),
                "isbn": book_data.get("isbn", ""),
            }
            await books_col.insert_one(book_doc)

        # Check if user already has this book
        existing = await user_books_col.find_one(
            {"user_id": ObjectId(current_user["id"]), "book_id": book_data["id"]}
        )
        if existing:
            raise HTTPException(
                status_code=400, detail="Book already in user's library"
            )

        book_doc = {
            "user_id": ObjectId(current_user["id"]),
            "book_id": book_data["id"],
            "current_page": 0,
            "status": "reading",
            "start_date": None,  # Will be set when first log is added
            "last_read_date": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        print("inserting book doc", book_doc)

        result = await user_books_col.insert_one(book_doc)
        return {"message": "Book added to library", "book_id": str(result.inserted_id)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding book: {str(e)}")


@router.post("/user/library/remove")
async def remove_book_from_user(
    payload: dict = Body(...),
    user_books_col=Depends(get_user_books_collection),
    current_user: dict = Depends(get_current_user),
):
    try:
        book_id = None
        if isinstance(payload, dict):
            book_id = payload.get("book_id")
        else:
            book_id = str(payload)

        print(book_id)
        print(current_user["id"])
        find = await user_books_col.find(
            {
                "user_id": ObjectId(current_user["id"]),
                "book_id": str(book_id),
            }
        ).to_list(None)

        print(find)

        await user_books_col.delete_one(
            {
                "user_id": ObjectId(current_user["id"]),
                "book_id": book_id,
            }
        )
        print("Book Removed from Library")
        return {"message": "Book removed from library"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error removing book: {str(e)}")


@router.get("/user/library")
async def get_user_library(
    books_col=Depends(get_books_collection),
    user_books_col=Depends(get_user_books_collection),
    current_user: dict = Depends(get_current_user),
):
    """Get user's book library"""
    try:
        # Get user's books
        user_books = await user_books_col.find(
            {"user_id": ObjectId(current_user["id"])}
        ).to_list(None)

        # Get book details for each user book
        books = []
        for user_book in user_books:
            book = await books_col.find_one({"google_id": user_book["book_id"]})
            if book:
                # Combine user book data with book details
                combined = {
                    "_id": str(user_book["_id"]),
                    "user_id": str(user_book["user_id"]),
                    "book_id": user_book["book_id"],
                    "title": book["title"],
                    "authors": book["authors"],
                    "thumbnail": book["thumbnail"],
                    "total_pages": book["page_count"],
                    "current_page": user_book["current_page"],
                    "status": user_book["status"],
                    "start_date": user_book["start_date"],
                    "last_read_date": user_book["last_read_date"],
                    "created_at": user_book["created_at"],
                    "updated_at": user_book["updated_at"],
                }
                books.append(combined)

        return {"books": books}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching library: {str(e)}")


@router.post("/user/log")
async def log_reading(
    log_data: dict = Body(...),
    user_books_col=Depends(get_user_books_collection),
    reading_logs_col=Depends(get_reading_logs_collection),
    current_user: dict = Depends(get_current_user),
):
    """Log reading progress for a book"""
    try:
        # Check if this is the first log for this book
        existing_logs = await reading_logs_col.count_documents(
            {
                "user_id": ObjectId(current_user["_id"]),
                "book_id": ObjectId(log_data["book_id"]),
            },
        )

        # Create log entry
        log_doc = {
            "user_id": ObjectId(current_user["_id"]),
            "book_id": ObjectId(log_data["book_id"]),
            "reading_date": datetime.combine(
                date.today(), datetime.min.time()
            ),  # Date only
            "pages_read": log_data["pages_read"],
            "notes": log_data.get("notes", ""),
            "created_at": datetime.now(datetime.timezone.utc),
        }

        await reading_logs_col.insert_one(log_doc)

        # Update user's book progress
        update_data = {
            "current_page": log_data.get("current_page", 0),
            "last_read_date": datetime.now(datetime.timezone.utc),
            "updated_at": datetime.now(datetime.timezone.utc),
        }

        # If this is the first log, set start_date
        if existing_logs == 0:
            update_data["start_date"] = datetime.combine(
                date.today(), datetime.min.time()
            )

        await user_books_col.update_one(
            {"user_id": ObjectId(current_user["_id"]), "book_id": log_data["book_id"]},
            {"$set": update_data},
        )

        return {"message": "Reading logged successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error logging reading: {str(e)}")


@router.get("/user/{book_id}/logs")
async def get_book_logs(
    book_id: str,
    reading_logs_col=Depends(get_reading_logs_collection),
    current_user: dict = Depends(get_current_user),
):
    """Get reading logs for a specific book"""
    try:
        logs = (
            await reading_logs_col.find(
                {"user_id": ObjectId(current_user["_id"]), "book_id": book_id}
            )
            .sort("reading_date", -1)
            .to_list(None)
        )

        # Convert ObjectId to string
        for log in logs:
            log["_id"] = str(log["_id"])
            log["user_id"] = str(log["user_id"])

        return {"logs": logs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching logs: {str(e)}")
