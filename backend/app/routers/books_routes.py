from fastapi import APIRouter, HTTPException, Query, Depends, Body

from bson import ObjectId
from datetime import datetime, date, timezone
import math
import logging

import httpx
from app.logger import get_logger

logger = get_logger(__name__)

from app.settings import settings
from ..database.connection import (
    get_current_user,
    get_books_collection,
    get_user_books_collection,
    get_reading_logs_collection,
)
from ..database.models.book_models import Book, ReadingLogCreate

router = APIRouter(prefix="/books", tags=["books"])

GOOGLE_BOOKS_API_URL = "https://www.googleapis.com/books/v1/volumes"


# Search for books using google api
@router.get("/search")
async def search_books(
    query: str = Query(..., description="Search query for books"),
    page: int = Query(1, ge=1, description="Page number for results"),
    page_size: int = Query(10, ge=1, le=40, description="Results per page (max 40)"),
    books_col=Depends(get_books_collection),
    current_user: dict = Depends(get_current_user),
):
    """
    Search for books using Google Books API.
    Example: /books/search?q=harry+potter
    """
    logger.info(f"searchQuery: {query}")
    if not settings.GOOGLE_BOOKS_API_KEY:
        raise HTTPException(
            status_code=500, detail="Google Books API key not configured"
        )

    start_index = (page - 1) * page_size
    params = {
        "q": query,
        "key": settings.GOOGLE_BOOKS_API_KEY,
        "maxResults": page_size,
        "startIndex": start_index,
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

    total_items = data.get("totalItems", 0) or 0
    total_pages = math.ceil(total_items / page_size) if total_items else 0
    has_more = page < total_pages

    return {
        "totalItems": total_items,
        "books": books,
        "query": query,
        "page": page,
        "pageSize": page_size,
        "totalPages": total_pages,
        "hasMore": has_more,
        "nextPage": page + 1 if has_more else None,
    }


# Add book to user's library
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
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }

        logger.info(f"inserting book doc: {book_doc}")

        result = await user_books_col.insert_one(book_doc)
        return {"message": "Book added to library", "book_id": str(result.inserted_id)}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error adding book: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error adding book: {str(e)}")


# Remove book from user's library
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

        logger.info(f"book_id: {book_id}")
        logger.info(f"user_id: {current_user['id']}")
        find = await user_books_col.find(
            {
                "user_id": ObjectId(current_user["id"]),
                "book_id": str(book_id),
            }
        ).to_list(None)

        logger.info(f"found book: {find}")

        await user_books_col.delete_one(
            {
                "user_id": ObjectId(current_user["id"]),
                "book_id": book_id,
            }
        )
        logger.info("Book Removed from Library")
        return {"message": "Book removed from library"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error removing book: {str(e)}")


# Get user's book library
@router.get("/user/library")
async def get_user_library_summary(
    books_col=Depends(get_books_collection),
    user_books_col=Depends(get_user_books_collection),
    current_user: dict = Depends(get_current_user),
):
    """Get user's book library summary (optimized for list view)"""
    try:
        # Get user's books with basic info only
        user_books = await user_books_col.find(
            {"user_id": ObjectId(current_user["id"])}
        ).to_list(None)

        # Get book details for each user book (only essential fields)
        books = []
        for user_book in user_books:
            book = await books_col.find_one(
                {"google_id": user_book["book_id"]},
                {"title": 1, "authors": 1, "thumbnail": 1, "page_count": 1},
            )
            if book:
                # Calculate progress percentage
                total_pages = book.get("page_count", 0) or 0
                current_page = user_book.get("current_page", 0) or 0
                progress_percentage = (
                    (current_page / total_pages * 100) if total_pages > 0 else 0
                )

                # Return only essential data for list view
                combined = {
                    "_id": str(user_book["_id"]),
                    "book_id": user_book["book_id"],
                    "title": book.get("title", "Unknown Title"),
                    "thumbnail": book.get("thumbnail"),
                    "total_pages": total_pages,
                    "current_page": current_page,
                    "progress_percentage": round(progress_percentage, 1),
                    "last_read_date": user_book.get("last_read_date"),
                }
                books.append(combined)

        return {"books": books}
    except Exception as e:
        logging.error(f"Error fetching library summary: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Error fetching library summary: {str(e)}"
        )


# Get specific book details from user's library
@router.get("/user/library/book")
async def get_user_library_book(
    book_id: str = Query(..., description="Book ID to fetch details for"),
    books_col=Depends(get_books_collection),
    user_books_col=Depends(get_user_books_collection),
    current_user: dict = Depends(get_current_user),
):
    """Get specific book details from user's library"""
    try:
        # Get user's book
        user_book = await user_books_col.find_one(
            {"user_id": ObjectId(current_user["id"]), "book_id": book_id}
        )

        if not user_book:
            raise HTTPException(
                status_code=404, detail="Book not found in user's library"
            )

        # Get book details
        book = await books_col.find_one({"google_id": book_id})
        if not book:
            raise HTTPException(status_code=404, detail="Book details not found")

        # Combine user book data with book details
        combined = {
            "_id": str(user_book["_id"]),
            "user_id": str(user_book["user_id"]),
            "book_id": user_book["book_id"],
            "title": book["title"],
            "authors": book["authors"],
            "published_date": book.get("published_date", ""),
            "publisher": book.get("publisher", ""),
            "description": book.get("description", ""),
            "thumbnail": book["thumbnail"],
            "total_pages": book["page_count"],
            "categories": book.get("categories", []),
            "info_link": book.get("info_link", ""),
            "isbn": book.get("isbn", ""),
            "current_page": user_book["current_page"],
            "status": user_book["status"],
            "start_date": user_book["start_date"],
            "last_read_date": user_book["last_read_date"],
            "created_at": user_book["created_at"],
            "updated_at": user_book["updated_at"],
        }

        return combined
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching book details: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Error fetching book details: {str(e)}"
        )


@router.post("/user/library/book/modify")
async def modify_library_book(
    book_data: dict = Body(...),
    books_col=Depends(get_books_collection),
    current_user: dict = Depends(get_current_user),
):
    logger.info(f"book_data: {book_data}")
    try:
        # Get user book
        book = await books_col.find_one({"google_id": book_data["book_google_id"]})

        if not book:
            raise HTTPException(
                status_code=404, detail="Book not found in user's library"
            )

        # Update page count
        try:
            page_count = int(book_data.get("total_pages", book.get("page_count", 0)))
        except Exception:
            page_count = book.get("page_count", 0)

        await books_col.update_one(
            {"google_id": book_data["book_google_id"]},
            {"$set": {"page_count": page_count}},
        )

        return {
            "message": "Book page count updated successfully",
            "page_count": page_count,
        }

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating book: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error logging reading: {str(e)}")


@router.post("/user/library/book/modifyComplete")
async def modify_user_library_mark_complete(
    payload: dict = Body(...),
    user_books_col=Depends(get_user_books_collection),
    books_col=Depends(get_books_collection),
    current_user: dict = Depends(get_current_user),
):
    """Mark a user's book as completed. Payload: { "book_id": "<google_id>" }
    This will set the user's current_page to the canonical book.page_count and status to 'completed'.
    """
    try:
        book_id = payload.get("book_id") or payload.get("book_google_id")

        if not book_id:
            raise HTTPException(status_code=400, detail="book_id is required")

        # Ensure canonical book exists
        book = await books_col.find_one({"google_id": book_id})
        if not book:
            raise HTTPException(status_code=404, detail="Book not found")

        # Ensure user has this book in their library
        user_book = await user_books_col.find_one(
            {"user_id": ObjectId(current_user["id"]), "book_id": book_id}
        )
        if not user_book:
            raise HTTPException(
                status_code=404, detail="Book not found in user's library"
            )

        page_count = int(book.get("page_count", 0) or 0)
        update_fields = {
            "current_page": page_count,
            "status": "completed",
            "last_read_date": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }

        await user_books_col.update_one(
            {"user_id": ObjectId(current_user["id"]), "book_id": book_id},
            {"$set": update_fields},
        )

        # Optionally, return the updated fields
        return {
            "message": "User library entry marked complete",
            "updated": update_fields,
        }

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error marking user book complete: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Error modifying library entry: {str(e)}"
        )


# Log reading of a book
@router.post("/user/log/add")
async def add_log_reading(
    log_data: ReadingLogCreate,
    user_books_col=Depends(get_user_books_collection),
    reading_logs_col=Depends(get_reading_logs_collection),
    current_user: dict = Depends(get_current_user),
):
    """Log reading progress for a book"""
    try:
        # Parse and validate reading date
        reading_date = date.today()
        if log_data.reading_date:
            try:
                reading_date = datetime.fromisoformat(log_data.reading_date).date()
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid reading_date format. Use ISO format (YYYY-MM-DD)",
                )

        user_id = ObjectId(current_user["id"])
        book_id = log_data.book_id

        # Check if user has this book in their library
        user_book = await user_books_col.find_one(
            {"user_id": user_id, "book_id": book_id}
        )
        if not user_book:
            raise HTTPException(
                status_code=404, detail="Book not found in user's library"
            )

        # Validate current_page is not less than existing current_page
        if log_data.current_page < user_book.get("current_page", 0):
            raise HTTPException(
                status_code=400,
                detail=f"Current page ({log_data.current_page}) cannot be less than existing progress ({user_book.get('current_page', 0)})",
            )

        reading_datetime = datetime.combine(reading_date, datetime.min.time())

        # Check if log already exists for this date
        existing_log = await reading_logs_col.find_one(
            {
                "user_id": user_id,
                "book_id": book_id,
                "reading_date": reading_datetime,
            }
        )

        if existing_log:
            # Update existing log: increment pages_read and update current_page
            await reading_logs_col.update_one(
                {"_id": existing_log["_id"]},
                {
                    "$inc": {"pages_read": log_data.pages_read},
                    "$set": {
                        "current_page": log_data.current_page,
                        "notes": log_data.notes or existing_log.get("notes", ""),
                        "updated_at": datetime.now(timezone.utc),
                    },
                },
            )
            logging.info(
                f"Updated existing reading log for book {book_id} on {reading_date}"
            )
        else:
            # Create new log entry
            log_doc = {
                "user_id": user_id,
                "book_id": book_id,
                "reading_date": reading_datetime,
                "pages_read": log_data.pages_read,
                "current_page": log_data.current_page,
                "notes": log_data.notes or "",
                "created_at": datetime.now(timezone.utc),
            }
            await reading_logs_col.insert_one(log_doc)
            logging.info(
                f"Created new reading log for book {book_id} on {reading_date}"
            )

        # Update user's book progress
        update_data = {
            "current_page": log_data.current_page,
            "last_read_date": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }

        # If this is the first log ever for this book, set start_date
        total_logs = await reading_logs_col.count_documents(
            {
                "user_id": user_id,
                "book_id": book_id,
            }
        )

        if total_logs == 0:
            update_data["start_date"] = reading_datetime

        await user_books_col.update_one(
            {"user_id": user_id, "book_id": book_id},
            {"$set": update_data},
        )

        return {"message": "Reading logged successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error logging reading: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error logging reading: {str(e)}")


# Modify reading log
@router.post("/user/log/modify")
async def modify_log_reading(
    log_data: dict,
    reading_logs_col=Depends(get_reading_logs_collection),
    user_books_col=Depends(get_user_books_collection),
    current_user: dict = Depends(get_current_user),
):
    """Modify an existing reading log"""
    try:
        # Parse dates
        original_date = datetime.fromisoformat(
            log_data["original_date"].replace("Z", "+00:00")
        ).date()
        new_date = datetime.fromisoformat(log_data["reading_date"]).date()

        user_id = ObjectId(current_user["id"])
        book_id = log_data["book_id"]

        # Validate that the log exists
        existing_log = await reading_logs_col.find_one(
            {
                "user_id": user_id,
                "book_id": book_id,
                "reading_date": datetime.combine(original_date, datetime.min.time()),
            }
        )

        if not existing_log:
            raise HTTPException(status_code=404, detail="Reading log not found")

        # Update the log
        await reading_logs_col.update_one(
            {
                "user_id": user_id,
                "book_id": book_id,
                "reading_date": datetime.combine(original_date, datetime.min.time()),
            },
            {
                "$set": {
                    "pages_read": log_data["pages_read"],
                    "current_page": log_data.get("current_page", 0),
                    "notes": log_data["notes"],
                    "reading_date": datetime.combine(new_date, datetime.min.time()),
                    "updated_at": datetime.now(timezone.utc),
                },
            },
        )

        # Update user's book current_page if this was the most recent log
        # Get the most recent log for this book
        latest_log = await reading_logs_col.find_one(
            {"user_id": user_id, "book_id": book_id}, sort=[("reading_date", -1)]
        )

        if latest_log:
            await user_books_col.update_one(
                {"user_id": user_id, "book_id": book_id},
                {
                    "$set": {
                        "current_page": latest_log["current_page"],
                        "updated_at": datetime.now(timezone.utc),
                    }
                },
            )

        logging.info(f"Modified reading log for book {book_id}")
        return {"message": "Reading log modified successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error modifying reading log: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Error modifying reading log: {str(e)}"
        )


# Remove reading log
@router.post("/user/log/remove")
async def remove_log_reading(
    log_data: dict = Body(...),
    reading_logs_col=Depends(get_reading_logs_collection),
    user_books_col=Depends(get_user_books_collection),
    current_user: dict = Depends(get_current_user),
):
    logger.info(f"log_data: {log_data}")
    try:
        user_id = ObjectId(current_user["id"])
        log_id = ObjectId(log_data["log_id"])

        # Get the log before deleting it to know how many pages were read
        log_to_delete = await reading_logs_col.find_one({"_id": log_id})
        if not log_to_delete:
            raise HTTPException(status_code=404, detail="Reading log not found")

        book_id = log_to_delete["book_id"]
        pages_read_in_log = log_to_delete["pages_read"]
        log_date = log_to_delete["reading_date"]

        # Delete the log
        await reading_logs_col.delete_one({"_id": log_id})

        # Update user's book progress
        # Get the most recent log for this book after deletion
        latest_log = await reading_logs_col.find_one(
            {"user_id": user_id, "book_id": book_id}, sort=[("reading_date", -1)]
        )

        update_data = {"updated_at": datetime.now(timezone.utc)}

        if latest_log:
            # If there are still logs, update current_page to the latest log's current_page
            update_data["current_page"] = latest_log["current_page"]
            update_data["last_read_date"] = latest_log["reading_date"]
        else:
            # If no logs remain, reset progress
            update_data["current_page"] = 0
            update_data["last_read_date"] = None
            update_data["start_date"] = None

        await user_books_col.update_one(
            {"user_id": user_id, "book_id": book_id}, {"$set": update_data}
        )

        logging.info(
            f"Removed reading log for book {book_id} and updated book progress"
        )
        return {"message": "Reading log removed successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error removing reading log: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Error removing reading log: {str(e)}"
        )


@router.get("/user/logs")
async def get_library_log(
    book_id: str = Query(..., description="Book id to fetch logs for"),
    reading_logs_col=Depends(get_reading_logs_collection),
    current_user: dict = Depends(get_current_user),
):
    """Get reading logs for a specific book"""
    try:
        logs = (
            await reading_logs_col.find(
                {
                    "user_id": ObjectId(current_user["id"]),
                    "book_id": book_id,
                }
            )
            .sort("reading_date", -1)
            .to_list(None)
        )

        if not logs:
            return {"logs": []}

        # Convert ObjectId to string
        for log in logs:
            log["_id"] = str(log["_id"])
            log["user_id"] = str(log["user_id"])
            log["book_id"] = str(log["book_id"])

        return {"logs": logs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching logs: {str(e)}")
