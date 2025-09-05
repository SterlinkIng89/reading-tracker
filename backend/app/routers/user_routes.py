from fastapi import APIRouter, Depends

from ..database.models import UserCreate, UserOut
from ..services.auth_service import get_password_hash

from ..database.connection import get_users_collection, get_current_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
async def list_users(
    users_col=Depends(get_users_collection), current_user=Depends(get_current_user)
):
    cursor = users_col.find({}, {"password": 0})
    users = await cursor.to_list(length=1000)
    for u in users:
        u["id"] = str(u.pop("_id"))
    return users


@router.post("", response_model=UserOut)
async def create_user(user: UserCreate, users_col=Depends(get_users_collection)):
    pwd = user.password.get_secret_value()
    user_doc = {"username": user.username, "password": get_password_hash(pwd)}
    result = await users_col.insert_one(user_doc)
    return {"id": str(result.inserted_id), "username": user.username}
