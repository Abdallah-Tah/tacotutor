from .auth import router as auth_router
from .users import router as users_router
from .lessons import router as lessons_router
from .sessions import router as sessions_router
from .instructions import router as instructions_router
from .realtime import router as realtime_router

__all__ = [
    "auth_router",
    "users_router",
    "lessons_router",
    "sessions_router",
    "instructions_router",
    "realtime_router",
]
