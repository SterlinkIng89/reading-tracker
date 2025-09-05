from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from bson import ObjectId
from ..services.auth_service import decode_token
from ..settings import get_client

oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/token")


def get_users_collection():
    return get_client()["trackerdb"]["users"]


async def get_current_user(token: str = Depends(oauth2)):
    try:
        payload = decode_token(token)
        uid = payload.get("sub")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )
    users = get_users_collection()
    user = await users.find_one({"_id": ObjectId(uid)}, {"password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user["id"] = str(user.pop("_id"))
    return user
