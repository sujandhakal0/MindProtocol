from fastapi import APIRouter
from app.api import auth_routes, morning_routes, evening_routes, weekly_routes

api_router = APIRouter(prefix="/api")

# Auth routes (public + protected)
api_router.include_router(auth_routes.router, tags=["Authentication"])

# App routes (all protected — require JWT)
api_router.include_router(morning_routes.router, tags=["Morning Check-In"])
api_router.include_router(evening_routes.router, tags=["Evening Journal"])
api_router.include_router(weekly_routes.router, tags=["Weekly Summary"])