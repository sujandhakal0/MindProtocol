import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.api.router import api_router
from app.config import get_settings
from app.models.response_models import HealthResponse, ErrorResponse
from app.utils.helpers import setup_logging

setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logger.info(f"🧠 {settings.app_name} backend starting up...")
    yield
    logger.info("🛑 Shutting down.")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="MindProtocol API",
        description=(
            "Backend API for MindProtocol — a daily mental health companion app "
            "powered by AI-driven reflection and cognitive reframing."
        ),
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # ── CORS ──────────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Global Exception Handlers ────────────────────────────────────────────

    @app.exception_handler(ValidationError)
    async def validation_error_handler(request: Request, exc: ValidationError):
        logger.warning(f"Validation error on {request.url}: {exc}")
        return JSONResponse(
            status_code=422,
            content={"detail": exc.errors(), "code": "VALIDATION_ERROR"},
        )

    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError):
        logger.warning(f"ValueError on {request.url}: {exc}")
        return JSONResponse(
            status_code=400,
            content={"detail": str(exc), "code": "BAD_REQUEST"},
        )

    @app.exception_handler(RuntimeError)
    async def runtime_error_handler(request: Request, exc: RuntimeError):
        logger.error(f"RuntimeError on {request.url}: {exc}")
        return JSONResponse(
            status_code=503,
            content={"detail": str(exc), "code": "SERVICE_ERROR"},
        )

    @app.exception_handler(Exception)
    async def generic_error_handler(request: Request, exc: Exception):
        logger.exception(f"Unhandled exception on {request.url}: {exc}")
        return JSONResponse(
            status_code=500,
            content={"detail": "An internal server error occurred.", "code": "INTERNAL_ERROR"},
        )

    # ── Routes ───────────────────────────────────────────────────────────────
    app.include_router(api_router)

    @app.get("/", response_model=HealthResponse, tags=["Health"])
    async def health_check():
        return HealthResponse(status="ok", app=settings.app_name)

    @app.get("/health", response_model=HealthResponse, tags=["Health"])
    async def health():
        return HealthResponse(status="ok", app=settings.app_name)

    return app


app = create_app()
