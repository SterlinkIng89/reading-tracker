from fastapi import FastAPI
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
import os

app = FastAPI()

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://mongo:27017")
client = AsyncIOMotorClient(MONGO_URL)
db = client["reading_tracker"]


# Model
class Book(BaseModel):
    title: str
    author: str


@app.get("/")
def root():
    return {"msg": "Backend working!"}


@app.post("/books")
async def create_book(book: Book):
    result = await db.books.insert_one(book.dict())
    return {"id": str(result.inserted_id), **book.dict()}


@app.get("/books")
async def list_books():
    books = await db.books.find().to_list(100)
    return books
