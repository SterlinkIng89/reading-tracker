from fastapi import APIRouter, Depends, HTTPException, status

from ..database.models.user_models import UserCreate, UserOut
from ..services.auth_service import get_password_hash

from ..database.connection import get_user_books_collection, get_current_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
async def list_users(
    users_col=Depends(get_user_books_collection), current_user=Depends(get_current_user)
):
    cursor = users_col.find({}, {"password": 0})
    users = await cursor.to_list(length=1000)
    for u in users:
        u["id"] = str(u.pop("_id"))
    return users


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(user: UserCreate, users_col=Depends(get_user_books_collection)):
    # prevent duplicate usernames
    existing = await users_col.find_one({"username": user.username})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Username already exists"
        )

    pwd = user.password.get_secret_value()
    user_doc = {"username": user.username, "password": get_password_hash(pwd)}
    try:
        result = await users_col.insert_one(user_doc)
    except Exception:
        # Log the exception server-side if you have a logger; return generic message to client
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user",
        )

    return {"id": str(result.inserted_id), "username": user.username}
