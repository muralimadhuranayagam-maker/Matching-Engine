import time
import logging
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Body
from backend.app.services.live_intake_normalizer import (
    sanitize_and_order_updates,
    normalize_field_update,
)
from backend.app.services.live_intake_extractor import (
    extract_structured_entities_from_speech,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/candidates", tags=["Live Intake"])

# ============================================================
# Live Intake WebSocket Connection & Session Manager
# ============================================================

class LiveIntakeConnectionManager:
    def __init__(self):
        # Map of session_id -> List of active WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Cumulative state for active candidate form sessions: session_id -> Dict of field paths to values
        self.session_states: Dict[str, Dict[str, Any]] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)
        logger.info(f"WebSocket client connected to live intake session: {session_id}")

        # Send initial state snapshot to newly connected client
        current_state = self.session_states.get(session_id, {})
        await websocket.send_json({
            "type": "INIT_SYNC",
            "session_id": session_id,
            "connected_at": int(time.time() * 1000),
            "state": current_state
        })

    def disconnect(self, websocket: WebSocket, session_id: str):
        if session_id in self.active_connections:
            if websocket in self.active_connections[session_id]:
                self.active_connections[session_id].remove(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]
        logger.info(f"WebSocket client disconnected from live intake session: {session_id}")

    async def broadcast_updates(self, session_id: str, updates: Dict[str, Any]) -> int:
        """
        Broadcasts structured, validated field updates to all browser clients
        viewing this candidate's form session. Returns number of clients notified.
        """
        if not updates:
            return 0

        # Update in-memory cumulative session state
        if session_id not in self.session_states:
            self.session_states[session_id] = {}
        self.session_states[session_id].update(updates)

        connections = self.active_connections.get(session_id, [])
        if not connections:
            logger.debug(f"No active WebSocket clients for session {session_id}; updates saved in state.")
            return 0

        payload = {
            "type": "FIELD_UPDATES",
            "session_id": session_id,
            "timestamp": int(time.time() * 1000),
            "updates": updates
        }

        notified = 0
        dead_sockets = []
        for socket in connections:
            try:
                await socket.send_json(payload)
                notified += 1
            except Exception as e:
                logger.warning(f"Failed to send to client on session {session_id}: {e}")
                dead_sockets.append(socket)

        for dead in dead_sockets:
            self.disconnect(dead, session_id)

        return notified

manager = LiveIntakeConnectionManager()

# ============================================================
# API Endpoints
# ============================================================

@router.websocket("/live-intake/{session_id}")
async def websocket_live_intake(websocket: WebSocket, session_id: str):
    """
    Realtime WebSocket connection for Candidate Intake Form.
    Pushes structured updates as candidate speaks during live SnapServe phone call.
    """
    await manager.connect(websocket, session_id)
    try:
        while True:
            # Keep socket open; handle optional client pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)
    except Exception as e:
        logger.error(f"Live intake websocket error: {e}")
        manager.disconnect(websocket, session_id)


@router.post("/live-intake/{session_id}/fields")
async def update_live_fields(
    session_id: str,
    payload: Dict[str, Any] = Body(...)
):
    """
    Receives structured field updates from SnapServe live-call tool (intake_write/save_candidate_details).
    Validates, normalizes enum values, orders triggers first, and broadcasts to Candidate Intake Form UI.
    """
    raw_updates = payload.get("updates") or payload.get("fields") or {}
    
    # If SnapServe sends flat field keys like { firstName: "Siva", workStatus: "Experienced" },
    # adapt to dot-notation schema
    dot_updates: Dict[str, Any] = {}
    for k, v in raw_updates.items():
        dot_updates[k] = v

    # Also handle extra screen flags or disposition if present
    extra = payload.get("extra") or {}
    if isinstance(extra, dict):
        if extra.get("disposition"):
            dot_updates["call_disposition"] = extra["disposition"]
        elif extra.get("dispositionIds") and isinstance(extra["dispositionIds"], list) and len(extra["dispositionIds"]) > 0:
            dot_updates["call_disposition"] = extra["dispositionIds"][0]

    sanitized_updates, errors = sanitize_and_order_updates(dot_updates)

    if not sanitized_updates and errors:
        raise HTTPException(status_code=400, detail={"errors": errors})

    notified = await manager.broadcast_updates(session_id, sanitized_updates)

    return {
        "status": "SUCCESS",
        "session_id": session_id,
        "applied_updates": sanitized_updates,
        "notified_clients": notified,
        "validation_warnings": errors if errors else None
    }


@router.post("/live-intake/{session_id}/speech")
async def process_live_speech_turn(
    session_id: str,
    payload: Dict[str, str] = Body(...)
):
    """
    Ingests a spoken sentence from the candidate during an active call.
    Extracts structured entities server-side and broadcasts ONLY validated fields to the UI.
    NEVER sends the raw transcript to the browser.
    """
    utterance = payload.get("utterance", "")
    if not utterance:
        return {"status": "SKIPPED", "session_id": session_id, "applied_updates": {}}

    extracted_updates = extract_structured_entities_from_speech(utterance)

    if extracted_updates:
        notified = await manager.broadcast_updates(session_id, extracted_updates)
    else:
        notified = 0

    return {
        "status": "SUCCESS",
        "session_id": session_id,
        "applied_updates": extracted_updates,
        "notified_clients": notified
    }


@router.get("/live-intake/{session_id}/state")
async def get_live_session_state(session_id: str):
    """Returns the cumulative form state captured so far for this candidate session."""
    return {
        "session_id": session_id,
        "active_clients": len(manager.active_connections.get(session_id, [])),
        "state": manager.session_states.get(session_id, {})
    }
