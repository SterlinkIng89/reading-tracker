from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware

from .routers import auth_routes, user_routes, books_routes
from .logger import configure_logging, get_logger

configure_logging()
logger = get_logger(__name__)

app = FastAPI(title="Reading Tracker API")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

# Allow frontend dev origin for CORS (adjust in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# Development helper: ensure Origin echo for responses that may be created outside CORS middleware
@app.middleware("http")
async def ensure_cors_origin(request, call_next):
    response = await call_next(request)
    origin = request.headers.get("origin")
    if origin and origin in ["http://localhost:3000"]:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response


@app.get("/")
def root():
    return {"msg": "Tracker API"}


app.include_router(auth_routes.router)
app.include_router(user_routes.router)
app.include_router(books_routes.router)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception caught: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
    )
