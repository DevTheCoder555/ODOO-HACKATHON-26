import asyncio
import json
from datetime import datetime, timezone
from typing import Dict, List, Set, Any
from fastapi import WebSocket, WebSocketDisconnect

class ConnectionManager:
    """
    Real-Time WebSocket Connection Manager.
    Broadcasts real-time events (payments, billing runs, subscription transitions, overdue alerts)
    to all connected web clients in sub-millisecond latency.
    """
    def __init__(self):
        # Active connections mapped by connection id or set
        self.active_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)
        # Send initial connection handshake
        await websocket.send_json({
            "type": "CONNECTION_ESTABLISHED",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "message": "Connected to Brightloop Real-Time Event Stream"
        })

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            self.active_connections.discard(websocket)

    async def broadcast(self, event_type: str, payload: Dict[str, Any]):
        """
        Broadcasts an event to all connected clients.
        Automatically purges stale or dropped connections.
        """
        message = {
            "type": event_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "payload": payload
        }
        dead_connections = set()
        
        async with self._lock:
            connections = list(self.active_connections)

        for connection in connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.add(connection)

        if dead_connections:
            async with self._lock:
                self.active_connections.difference_update(dead_connections)

    def broadcast_sync(self, event_type: str, payload: Dict[str, Any]):
        """
        Synchronous wrapper to safely schedule broadcast from sync SQLAlchemy routes.
        """
        try:
            loop = asyncio.get_running_loop()
            if loop.is_running():
                asyncio.create_task(self.broadcast(event_type, payload))
        except RuntimeError:
            # If no running loop in current thread, run in new loop or pass
            pass

manager = ConnectionManager()

