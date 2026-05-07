from __future__ import annotations

from typing import Optional, Dict, Any
from dataclasses import dataclass
from fastapi import Request, HTTPException, status, Depends, FastAPI
from jose import jwt, JWTError
from pydantic_settings import BaseSettings, SettingsConfigDict
import re

class AuthSettings(BaseSettings):
    auth_secret_key: str
    auth_algorithm: str = "HS256"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

_settings = AuthSettings()

@dataclass
class AuthContext:
    user_id: int
    paid: bool
    admin: bool
    content_handler: bool
    payload: Dict[str, Any]

_BEARER_RE = re.compile(r"^Bearer\s+(.+)$", re.IGNORECASE)

def _extract_token(request: Request) -> Optional[str]:
    tok = request.cookies.get("access_token")
    if tok:
        return tok
    auth = request.headers.get("authorization")
    if not auth:
        return None
    m = _BEARER_RE.match(auth.strip())
    return m.group(1) if m else None

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

class JWTPayloadMiddleware:
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
                pass
        await self.app(scope, receive_wrapper, send_wrapper)

def add_auth_middleware(app: FastAPI) -> None:
    app.add_middleware(JWTPayloadMiddleware)

def auth_optional(request: Request) -> Optional[AuthContext]:
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

only_authenticated_required = auth_required

def paid_required(ctx: AuthContext = Depends(auth_required)) -> AuthContext:
    if not ctx.paid:
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

def payment_status(ctx: AuthContext = Depends(auth_required)) -> bool:
    return ctx.paid

def get_claim(name: str, default: Any = None):
    def _getter(ctx: AuthContext = Depends(auth_required)):
        return ctx.payload.get(name, default)
    return _getter