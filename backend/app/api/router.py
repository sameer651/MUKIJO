from fastapi import APIRouter
from app.routes import (
    auth_router,
    groups_router,
    courses_router,
    payments_router,
    events_router,
    fundraising_router,
    onboarding_router,
    venues_router,
    activities_router,
    dashboard_router,
    messages_router
)

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(groups_router)
api_router.include_router(courses_router)
api_router.include_router(payments_router)
api_router.include_router(events_router)
api_router.include_router(fundraising_router)
api_router.include_router(onboarding_router)
api_router.include_router(venues_router)
api_router.include_router(activities_router)
api_router.include_router(dashboard_router)
api_router.include_router(messages_router)
