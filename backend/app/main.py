from fastapi import FastAPI
from fastapi.security import OAuth2PasswordBearer

from .routers import auth_routes, user_routes

app = FastAPI(title="Reading Tracker API")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


@app.get("/")
def root():
    return {"msg": "Tracker API"}


app.include_router(auth_routes.router)
app.include_router(user_routes.router)
