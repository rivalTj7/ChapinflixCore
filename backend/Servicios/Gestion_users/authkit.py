from __future__ import annotations
from typing import Optional, Dict, Any
from dataclasses import dataclass
from fastapi import Request, HTTPException, status, Depends, FastAPI
from jose import jwt, JWTError
from pydantic_settings import BaseSettings, SettingsConfigDict
import re

# ---------- Settings ----------
class AuthSettings(BaseSettings):
    auth_secret_key: str  # SAME SECRET as your auth service
    auth_algorithm: str = "HS256"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"  # ← CRÍTICO: Ignorar variables extra del .env
    )

_settings = AuthSettings()

# ---------- Model ----------
@dataclass
class AuthContext:
    user_id: int
    paid: bool
    admin: bool
    content_handler: bool
    payload: Dict[str, Any]

# ---------- Token extraction ----------
_BEARER_RE = re.compile(r"^Bearer\s+(.+)$", re.IGNORECASE)

def _extract_token(request: Request) -> Optional[str]:
    # 1) Cookie
    tok = request.cookies.get("access_token")
    if tok:
        return tok
    # 2) Authorization header
    auth = request.headers.get("authorization")
    if not auth:
        return None
    m = _BEARER_RE.match(auth.strip())
    return m.group(1) if m else None

# ---------- Verify + decode ----------
def _decode_jwt(token: str, expect_type: str = "access") -> Dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            _settings.auth_secret_key,
            algorithms=[_settings.auth_algorithm],
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    # Enforce token type
    t = payload.get("type")
    if expect_type and t != expect_type:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token type: {t!r}",
        )
    return payload

def _to_auth_context(payload: Dict[str, Any]) -> AuthContext:
    sub = payload.get("sub")
    if sub is None:
        raise HTTPException(status_code=401, detail="Token missing 'sub'")
    try:
        uid = int(sub)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid 'sub'")

    paid = bool(payload.get("paid", False))
    admin = bool(payload.get("admin", False))
    content_handler = bool(payload.get("content_handler", False))

    return AuthContext(
        user_id=uid,
        paid=paid,
        admin=admin,
        content_handler=content_handler,
        payload=payload,
    )

# ---------- Middleware (optional but nice) ----------
class JWTPayloadMiddleware:
    """
    Parses the JWT once per request (if present) and stores AuthContext in request.state.auth.
    Use with dependencies below; they'll reuse the parsed payload when available.
    """
    def __init__(self, app: FastAPI):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def receive_wrapper():
            return await receive()

        async def send_wrapper(message):
            await send(message)

        request = Request(scope, receive=receive)
        token = _extract_token(request)
        if token:
            try:
                payload = _decode_jwt(token, expect_type="access")
                scope.setdefault("state", {})
                scope["state"]["auth"] = _to_auth_context(payload)
            except HTTPException:
                # Do not raise here; let dependencies enforce as needed
                pass

        await self.app(scope, receive_wrapper, send_wrapper)

def add_auth_middleware(app: FastAPI) -> None:
    app.add_middleware(JWTPayloadMiddleware)

# ---------- Dependencies ----------
def auth_optional(request: Request) -> Optional[AuthContext]:
    # Use parsed payload from middleware if available
    ctx = getattr(request.state, "auth", None)
    if ctx:
        return ctx

    token = _extract_token(request)
    if not token:
        return None

    payload = _decode_jwt(token, expect_type="access")
    return _to_auth_context(payload)

def auth_required(request: Request) -> AuthContext:
    ctx = auth_optional(request)
    if ctx is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return ctx

# Alias if you prefer this name in routers
only_authenticated_required = auth_required

def paid_required(ctx: AuthContext = Depends(auth_required)) -> AuthContext:
    if not ctx.paid:
        # 402 "Payment Required" (or use 403 if you prefer)
        raise HTTPException(status_code=402, detail="Payment required")
    return ctx

def admin_required(ctx: AuthContext = Depends(auth_required)) -> AuthContext:
    if not ctx.admin:
        raise HTTPException(status_code=403, detail="Admin required")
    return ctx

def content_handler_required(ctx: AuthContext = Depends(auth_required)) -> AuthContext:
    if not ctx.content_handler:
        raise HTTPException(status_code=403, detail="Content handler required")
    return ctx

# --------- Combined auth + return paid flag (no enforcement) ----------
def payment_status(ctx: AuthContext = Depends(auth_required)) -> bool:
    """
    Validates JWT (like authenticated-only) and returns the 'paid' flag.
    Use this when your endpoint needs to compare 'paid' against other flags
    (e.g., movie.is_free) without forcing paid access.
    """
    return ctx.paid

# ---------- Convenience: quick claim getter ----------
def get_claim(name: str, default: Any = None):
    def _getter(ctx: AuthContext = Depends(auth_required)):
        return ctx.payload.get(name, default)
    return _getter