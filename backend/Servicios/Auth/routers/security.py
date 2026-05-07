from fastapi import Request, HTTPException, status

def get_token_from_request(request: Request, expected_type: str = "access") -> str:
    """
    Prefer cookie; fall back to Authorization: Bearer <token>.
    expected_type is only informational here (you still validate type via verify_token()).
    """
    # 1) Cookies (browser-friendly)
    cookie_name = "access_token" if expected_type == "access" else "refresh_token"
    token = request.cookies.get(cookie_name)
    if token:
        return token

    # 2) Authorization header (CLI/tools)
    auth = request.headers.get("authorization") or request.headers.get("Authorization")
    if auth and auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip()

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
