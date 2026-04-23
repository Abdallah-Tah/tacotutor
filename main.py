"""
TacoTutor - Unified launcher for v2.0 platform.
Runs the FastAPI backend (which serves the React frontend static files).
"""

import os
import shutil
import subprocess
import uvicorn
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent
APP_DIR = REPO_ROOT / "app"
FRONTEND_DIST_DIR = APP_DIR / "dist"
FRONTEND_DIST_INDEX = FRONTEND_DIST_DIR / "index.html"

sys.path.insert(0, str(REPO_ROOT))

from backend.core.config import settings
from backend.core.database import Base, engine
from backend.seed import seed_lessons


def _latest_mtime(paths: list[Path]) -> float:
    latest = 0.0
    for path in paths:
        if path.exists():
            latest = max(latest, path.stat().st_mtime)
    return latest


def _frontend_build_is_stale() -> bool:
    if not FRONTEND_DIST_INDEX.exists():
        return True

    source_roots = [
        APP_DIR / "src",
        APP_DIR / "index.html",
        APP_DIR / "vite.config.ts",
        APP_DIR / "package.json",
        APP_DIR / "package-lock.json",
        APP_DIR / "tsconfig.json",
        APP_DIR / "tailwind.config.js",
        APP_DIR / "postcss.config.js",
    ]

    source_files: list[Path] = []
    for root in source_roots:
        if root.is_dir():
            source_files.extend(path for path in root.rglob("*") if path.is_file())
        elif root.exists():
            source_files.append(root)

    dist_files = [path for path in FRONTEND_DIST_DIR.rglob("*") if path.is_file()]
    return _latest_mtime(source_files) > _latest_mtime(dist_files)


def ensure_frontend_build() -> None:
    if os.environ.get("SKIP_FRONTEND_BUILD", "").lower() in {"1", "true", "yes"}:
        print("Skipping frontend build check because SKIP_FRONTEND_BUILD is set.")
        return

    if not _frontend_build_is_stale():
        print("Frontend build is up to date.")
        return

    npm_path = shutil.which("npm")
    if npm_path is None:
        raise RuntimeError(
            "Frontend build is missing or stale, but npm is not installed. "
            "Run `cd app && npm run build` before starting TacoTutor."
        )

    print("Frontend build is missing or stale. Running `npm run build`...")
    subprocess.run([npm_path, "run", "build"], cwd=APP_DIR, check=True)
    print("Frontend build completed.")

if __name__ == "__main__":
    print("🌮 TacoTutor v2.0")
    print("Setting up database...")

    ensure_frontend_build()

    # Create tables
    Base.metadata.create_all(bind=engine)

    # Seed initial data
    seed_lessons()

    print("Starting server...")
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8088,
        reload=settings.DEBUG,
        workers=1,
    )
