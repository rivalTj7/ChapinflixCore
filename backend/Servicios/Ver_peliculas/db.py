# ===================== db.py =====================
import os
import json
import asyncpg
from typing import AsyncIterator

_pool: asyncpg.Pool | None = None

async def _init_conn(con: asyncpg.Connection):
    await con.set_type_codec(
        'json',
        encoder=json.dumps,
        decoder=json.loads,
        schema='pg_catalog',
    )
    await con.set_type_codec(
        'jsonb',
        encoder=json.dumps,
        decoder=json.loads,
        schema='pg_catalog',
    )
    # Usamos el esquema de negocio
    await con.execute("SET search_path TO content, public;")

async def init_pool():
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            dsn=os.getenv("DATABASE_URL", "postgresql://betebetoven:betebetoven@localhost:5432/general"),
            init=_init_conn,
            min_size=1,
            max_size=10,
        )

async def close_pool():
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None

async def get_conn() -> AsyncIterator[asyncpg.Connection]:
    if _pool is None:
        await init_pool()
    async with _pool.acquire() as con:
        yield con
