from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from bson import ObjectId

from ..services.auth_service import (
    create_access_token,
    create_refresh_token,
    verify_password,
    get_password_hash,
    decode_token,
)
from ..database.connection import get_users_collection, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/token")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    users_col=Depends(get_users_collection),
):
    user = await users_col.find_one({"username": form_data.username})
    if not user or not verify_password(form_data.password, user.get("password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access = create_access_token(
        {"sub": str(user["_id"]), "username": user["username"]}
    )
    refresh = create_refresh_token(
        {"sub": str(user["_id"]), "username": user["username"]}
    )
    await users_col.update_one(
        {"_id": user["_id"]}, {"$set": {"refresh_token": get_password_hash(refresh)}}
    )
    return {"access_token": access, "refresh_token": refresh, "token_type": "bearer"}


@router.post("/refresh")
async def refresh(body: dict, users_col=Depends(get_users_collection)):
    token = body.get("refresh_token")
    if not token:
        raise HTTPException(status_code=400, detail="refresh_token required")
    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    user = await users_col.find_one({"_id": ObjectId(user_id)})
    if not user or "refresh_token" not in user:
        raise HTTPException(status_code=401, detail="Refresh token not found")
    if not verify_password(token, user["refresh_token"]):
        raise HTTPException(status_code=401, detail="Refresh token mismatch")
    new_access = create_access_token(
        {"sub": str(user["_id"]), "username": user["username"]}
    )
    new_refresh = create_refresh_token(
        {"sub": str(user["_id"]), "username": user["username"]}
    )
    await users_col.update_one(
        {"_id": user["_id"]},
        {"$set": {"refresh_token": get_password_hash(new_refresh)}},
    )
    return {
        "access_token": new_access,
        "refresh_token": new_refresh,
        "token_type": "bearer",
    }


@router.post("/logout")
async def logout(
    current_user: dict = Depends(get_current_user),
    users_col=Depends(get_users_collection),
):
    await users_col.update_one(
        {"_id": ObjectId(current_user["id"])}, {"$unset": {"refresh_token": ""}}
    )
    return {"msg": "logged out"}
