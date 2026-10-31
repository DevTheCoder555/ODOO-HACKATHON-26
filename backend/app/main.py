import os
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import settings
from app.database import engine, Base
from app.seed import seed_database
from app.realtime import manager

# Routers
from app.routers import (
    auth, users, products, plans, templates,
    subscriptions, invoices, payments, discounts, taxes, analytics,
    forex, webhooks
)

# Ensure database tables exist
Base.metadata.create_all(bind=engine)
try:
    seed_database()
except Exception as e:
    print(f"Notice on seed: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    try:
        seed_database()
    except Exception as e:
        print(f"Error seeding database: {e}")
    yield

app = FastAPI(
    title="Brightloop Subscription Management API",
    description="Unified backend engine for subscriptions, recurring billing, discounts, taxes, and finance analytics.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration for secure frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all API routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(products.router)
app.include_router(plans.router)
app.include_router(templates.router)
app.include_router(subscriptions.router)
app.include_router(invoices.router)
app.include_router(payments.router)
app.include_router(discounts.router)
app.include_router(taxes.router)
app.include_router(analytics.router)
app.include_router(forex.router)
app.include_router(webhooks.router)

# Real-Time WebSocket Endpoint
@app.websocket("/ws/events")
@app.websocket("/api/ws/events")
async def websocket_event_endpoint(websocket: WebSocket):
    """
    Bi-directional real-time event pipeline for live dashboard updates,
    streaming payment receipts, invoice generation, and subscription state changes.
    """
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception:
        await manager.disconnect(websocket)

@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": "1.0.0"
    }

# Mount frontend static distribution if built
FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str, request: Request):
        if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            raise HTTPException(status_code=404, detail="Not Found")
        file_path = FRONTEND_DIST / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIST / "index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
