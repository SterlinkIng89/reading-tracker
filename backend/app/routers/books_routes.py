from fastapi import APIRouter, HTTPException, Query
import httpx
from app.settings import settings

router = APIRouter(prefix="/books", tags=["books"])

GOOGLE_BOOKS_API_URL = "https://www.googleapis.com/books/v1/volumes"


@router.get("/search")
async def search_books(q: str = Query(..., description="Search query for books")):
    """
    Search for books using Google Books API.
    Example: /books/search?q=harry+potter
    """
    if not settings.GOOGLE_BOOKS_API_KEY:
        raise HTTPException(
            status_code=500, detail="Google Books API key not configured"
        )

    print(f"'settings.GOOGLE_BOOKS_API_KEY: {settings.GOOGLE_BOOKS_API_KEY}'")

    params = {
        "q": q,
        "key": settings.GOOGLE_BOOKS_API_KEY,
        "maxResults": 5,  # Limit results for example
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

    # Extract relevant book information
    books = []
    for item in data.get("items", []):

        print("item:", item)
        volume_info = item.get("volumeInfo", {})
        book = {
            "id": item.get("id"),
            "title": volume_info.get("title"),
            "authors": volume_info.get("authors", []),
            "publishedDate": volume_info.get("publishedDate"),
            "description": volume_info.get("description"),
            "imageLinks": volume_info.get("imageLinks"),
            "infoLink": volume_info.get("infoLink"),
        }
        books.append(book)

    return {"totalItems": data.get("totalItems", 0), "books": books}
