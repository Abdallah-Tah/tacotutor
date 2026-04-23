"""
TacoTutor Backend - FastAPI entry point.
"""

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.core.config import settings
from backend.core.database import engine, Base
from backend.api import auth, users, lessons, sessions, instructions, realtime

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    description="AI Quran Tutoring Platform for Kids",
    version="2.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"[DEBUG] Request: {request.method} {request.url.path}")
    response = await call_next(request)
    print(f"[DEBUG] Response: {response.status_code}")
    return response

dist_path = Path(__file__).resolve().parents[1] / "app" / "dist"

# API routes
app.include_router(auth.router, prefix="/api/auth")
app.include_router(users.router, prefix="/api/users")
app.include_router(lessons.router, prefix="/api/lessons")
app.include_router(sessions.router, prefix="/api/sessions")
app.include_router(instructions.router, prefix="/api/instructions")
app.include_router(realtime.router, prefix="/api/realtime")

@app.get("/api/health")
def health():
    return {"status": "ok", "version": "2.0.0"}

# Serve Assets
if (dist_path / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(dist_path / "assets")), name="assets")

# SPA Serving logic (Root)
if dist_path.exists():
    @app.get("/", include_in_schema=False)
    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str = ""):
        # If it's an asset or API call that 404'd, don't serve index.html
        if full_path.startswith("api/") or full_path.startswith("assets/"):
            raise HTTPException(status_code=404)
            
        index_file = dist_path / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Frontend build not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8088, reload=settings.DEBUG)
