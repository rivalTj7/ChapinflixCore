from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
import asyncpg
from db import get_conn
from authkit import (
    admin_required,
    AuthContext,
)
from models.schemas import (
    UserListFilters,
    UserListResponse,
    UserListItem,
    UserCounters,
    UserDetail,
    SetActive,
    SetVerified,
    SetPaid,
    SetAdmin,
    SetContentHandler,
)

router = APIRouter(prefix="/users", tags=["users"])

# ---------- Listing and Search ----------
@router.get("/list", response_model=UserListResponse)
async def list_users(
    # Query params
    query: Optional[str] = Query(None, description="Search in email/username"),
    created_from: Optional[str] = Query(None),
    created_to: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    is_verified: Optional[bool] = Query(None),
    is_paid: Optional[bool] = Query(None),
    is_admin: Optional[bool] = Query(None),
    is_content_handler: Optional[bool] = Query(None),
    two_fa_enabled: Optional[bool] = Query(None),
    locked_only: Optional[bool] = Query(None),
    failed_login_min: Optional[int] = Query(None),
    order_by: str = Query("created_at"),
    order_dir: str = Query("DESC"),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    conn=Depends(get_conn),
    auth: AuthContext = Depends(admin_required)
):
    """
    List users with filters, pagination, and ordering.
    Admin only.
    """
    try:
        rows = await conn.fetch(
            """
            SELECT * FROM app.fn_admin_users_list(
                $1::text,            -- query
                $2::timestamptz,     -- created_from
                $3::timestamptz,     -- created_to
                $4::boolean,         -- is_active
                $5::boolean,         -- is_verified
                $6::boolean,         -- is_paid
                $7::boolean,         -- is_admin
                $8::boolean,         -- is_content_handler
                $9::boolean,         -- two_fa_enabled
                $10::boolean,        -- locked_only
                $11::int,            -- failed_login_min
                $12::text,           -- order_by
                $13::text,           -- order_dir
                $14::int,            -- limit
                $15::int             -- offset
                );

            """,
            query,
            created_from,
            created_to,
            is_active,
            is_verified,
            is_paid,
            is_admin,
            is_content_handler,
            two_fa_enabled,
            locked_only,
            failed_login_min,
            order_by,
            order_dir,
            limit,
            offset
        )
        
        if not rows:
            return UserListResponse(total_count=0, items=[])
        
        total_count = rows[0]["total_count"]
        items = [
            UserListItem(
                id=row["id"],
                email=row["email"],
                username=row["username"],
                first_name=row["first_name"],
                last_name=row["last_name"],
                is_active=row["is_active"],
                is_verified=row["is_verified"],
                is_paid=row["is_paid"],
                is_admin=row["is_admin"],
                is_content_handler=row["is_content_handler"],
                two_fa_enabled=row["two_fa_enabled"],
                failed_login_attempts=row["failed_login_attempts"],
                locked_until=row["locked_until"],
                created_at=row["created_at"],
                updated_at=row["updated_at"]
            )
            for row in rows
        ]
        
        return UserListResponse(total_count=total_count, items=items)
        
    except asyncpg.PostgresError as e:
        raise HTTPException(status_code=400, detail=str(e))

# ---------- Counters ----------
@router.get("/counters", response_model=UserCounters)
async def get_user_counters(
    failed_login_min: int = Query(5, description="Min failed login attempts"),
    conn=Depends(get_conn),
    auth: AuthContext = Depends(admin_required)
):
    """
    Get user counters (total, active, verified, paid, etc).
    Admin only.
    """
    try:
        row = await conn.fetchrow(
            "SELECT * FROM app.fn_admin_users_counters($1::int);",
            failed_login_min
        )
        
        return UserCounters(
            count_total=row["count_total"],
            count_active=row["count_active"],
            count_verified=row["count_verified"],
            count_paid=row["count_paid"],
            count_admin=row["count_admin"],
            count_content_handler=row["count_content_handler"],
            count_twofa_enabled=row["count_twofa_enabled"],
            count_locked=row["count_locked"],
            count_failed_ge_n=row["count_failed_ge_n"]
        )
        
    except asyncpg.PostgresError as e:
        raise HTTPException(status_code=400, detail=str(e))

# ---------- User Detail ----------
@router.get("/{user_id}/detail", response_model=UserDetail)
async def get_user_detail(
    user_id: int,
    conn=Depends(get_conn),
    auth: AuthContext = Depends(admin_required)
):
    """
    Get detailed user information including token stats.
    Admin only.
    """
    try:
        row = await conn.fetchrow(
            "SELECT * FROM app.fn_admin_user_detail($1::bigint);",
            user_id
        )
        
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        
        return UserDetail(
            id=row["id"],
            email=row["email"],
            username=row["username"],
            first_name=row["first_name"],
            last_name=row["last_name"],
            is_active=row["is_active"],
            is_verified=row["is_verified"],
            is_paid=row["is_paid"],
            is_admin=row["is_admin"],
            is_content_handler=row["is_content_handler"],
            two_fa_enabled=row["two_fa_enabled"],
            failed_login_attempts=row["failed_login_attempts"],
            locked_until=row["locked_until"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            email_tokens_total=row["email_tokens_total"],
            email_tokens_active=row["email_tokens_active"],
            refresh_tokens_total=row["refresh_tokens_total"],
            refresh_tokens_active=row["refresh_tokens_active"]
        )
        
    except asyncpg.PostgresError as e:
        raise HTTPException(status_code=400, detail=str(e))

# ---------- Set User Flags ----------
@router.put("/{user_id}/active")
async def set_user_active(
    user_id: int,
    body: SetActive,
    conn=Depends(get_conn),
    auth: AuthContext = Depends(admin_required)
):
    """
    Activate or deactivate a user account.
    Admin only.
    """
    try:
        await conn.execute(
            "SELECT app.fn_admin_user_set_active($1::bigint, $2::boolean);",
            user_id,
            body.is_active
        )
        return {"ok": True, "user_id": user_id, "is_active": body.is_active}
        
    except asyncpg.PostgresError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{user_id}/verified")
async def set_user_verified(
    user_id: int,
    body: SetVerified,
    conn=Depends(get_conn),
    auth: AuthContext = Depends(admin_required)
):
    """
    Set user verification status.
    Admin only.
    """
    try:
        await conn.execute(
            "SELECT app.fn_admin_user_set_verified($1::int, $2::boolean);",
            user_id,
            body.is_verified
        )
        return {"ok": True, "user_id": user_id, "is_verified": body.is_verified}
        
    except asyncpg.PostgresError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{user_id}/paid")
async def set_user_paid(
    user_id: int,
    body: SetPaid,
    conn=Depends(get_conn),
    auth: AuthContext = Depends(admin_required)
):
    """
    Set user paid status.
    Admin only.
    """
    try:
        await conn.execute(
            "SELECT app.fn_admin_user_set_paid($1::bigint, $2::boolean);",
            user_id,
            body.is_paid
        )
        return {"ok": True, "user_id": user_id, "is_paid": body.is_paid}
        
    except asyncpg.PostgresError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{user_id}/admin")
async def set_user_admin(
    user_id: int,
    body: SetAdmin,
    conn=Depends(get_conn),
    auth: AuthContext = Depends(admin_required)
):
    """
    Set user admin role. 
    Has safeguard against removing the last admin.
    Admin only.
    """
    try:
        await conn.execute(
            "SELECT app.fn_admin_user_set_admin($1::bigint, $2::boolean);",
            user_id,
            body.is_admin
        )
        return {"ok": True, "user_id": user_id, "is_admin": body.is_admin}
        
    except asyncpg.PostgresError as e:
        # Handle the specific "last admin" error gracefully
        if "último administrador" in str(e) or "last admin" in str(e).lower():
            raise HTTPException(
                status_code=400,
                detail="Cannot remove admin role from the last administrator"
            )
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{user_id}/content-handler")
async def set_user_content_handler(
    user_id: int,
    body: SetContentHandler,
    conn=Depends(get_conn),
    auth: AuthContext = Depends(admin_required)
):
    """
    Set user content handler role.
    Admin only.
    """
    try:
        await conn.execute(
            "SELECT app.fn_admin_user_set_content_handler($1::bigint, $2::boolean);",
            user_id,
            body.is_content_handler
        )
        return {"ok": True, "user_id": user_id, "is_content_handler": body.is_content_handler}
        
    except asyncpg.PostgresError as e:
        raise HTTPException(status_code=400, detail=str(e))