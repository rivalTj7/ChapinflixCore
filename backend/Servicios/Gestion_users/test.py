# test.py (llamadas posicionales con casts + search_path a 'content')
import os
import uuid
import argparse
from datetime import datetime, timedelta

import psycopg
from psycopg.rows import dict_row

DEFAULT_DB_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://betebetoven:betebetoven@localhost:5432/general"
)

def log(title):
    print("\n" + "="*80)
    print(title)
    print("="*80)

def pp(label, rows):
    print(f"\n{label}:")
    if isinstance(rows, list):
        for i, r in enumerate(rows, 1):
            print(f"#{i}: {r}")
    else:
        print(rows)

def call_fn_all(cur, sql, params=None):
    cur.execute(sql, params or ())
    return cur.fetchall()

def call_fn_one(cur, sql, params=None):
    cur.execute(sql, params or ())
    return cur.fetchone()

def create_test_users(cur):
    uid = str(uuid.uuid4())[:8]
    users = {
        "admin1": {
            "email": f"admin1_{uid}@test.local",
            "username": f"admin1_{uid}",
            "first_name": "Admin",
            "last_name": "One",
            "is_admin": True,
        },
        "admin2": {
            "email": f"admin2_{uid}@test.local",
            "username": f"admin2_{uid}",
            "first_name": "Admin",
            "last_name": "Two",
            "is_admin": True,
        },
        "user1": {
            "email": f"user1_{uid}@test.local",
            "username": f"user1_{uid}",
            "first_name": "User",
            "last_name": "One",
            "is_admin": False,
        },
    }

    insert_sql = """
        INSERT INTO users(email, username, password_hash, first_name, last_name,
                          is_active, is_verified, two_fa_enabled, failed_login_attempts,
                          is_paid, is_admin, is_content_handler, created_at, updated_at)
        VALUES (%s,%s,'$fakehash$',%s,%s, TRUE, FALSE, FALSE, 0, FALSE, %s, FALSE, now(), now())
        RETURNING id;
    """
    for key, u in users.items():
        cur.execute(
            insert_sql,
            (u["email"], u["username"], u["first_name"], u["last_name"], u["is_admin"])
        )
        users[key]["id"] = cur.fetchone()["id"]

    return users

def seed_tokens_for_user(cur, user_id):
    now = datetime.utcnow()
    cur.execute(
        """
        INSERT INTO email_verification_tokens(user_id, token, expires_at, created_at)
        VALUES
          (%s, %s, %s, now()),
          (%s, %s, %s, now());
        """,
        (
            user_id, f"ev_active_{uuid.uuid4()}", now + timedelta(days=1),
            user_id, f"ev_expired_{uuid.uuid4()}", now - timedelta(days=1),
        )
    )

    cur.execute(
        """
        INSERT INTO refresh_tokens(user_id, token, expires_at, created_at)
        VALUES
          (%s, %s, %s, now()),
          (%s, %s, %s, now());
        """,
        (
            user_id, f"rt_active_{uuid.uuid4()}", now + timedelta(days=7),
            user_id, f"rt_expired_{uuid.uuid4()}", now - timedelta(days=7),
        )
    )

def teardown_users(cur, user_ids):
    cur.execute("DELETE FROM users WHERE id = ANY(%s);", (user_ids,))

def debug_show_fn_sig(cur):
    rows = call_fn_all(cur, """
        SELECT n.nspname AS schema,
               p.proname AS name,
               pg_get_function_identity_arguments(p.oid) AS identity_args
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE p.proname = 'fn_admin_users_list'
        ORDER BY 1,2;
    """)
    pp("DEBUG: fn_admin_users_list signatures", rows)

# -------------------------------
# Tests
# -------------------------------
def test_listing_and_counters(conn, users):
    with conn.cursor(row_factory=dict_row) as cur:
        log("1) LISTADO + FILTROS + PAGINACIÓN + CONTADORES")

        # (1) Muestra la(s) firma(s) que ve PostgreSQL
        debug_show_fn_sig(cur)

        # Llamada POSICIONAL con TODOS los parámetros, casteados al tipo correcto
        # Firma:
        # (TEXT, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN,
        #  BOOLEAN, BOOLEAN, INTEGER, TEXT, TEXT, INTEGER, INTEGER)
        base_args = [
            None,                 # p_query
            None,                 # p_created_from
            None,                 # p_created_to
            None,                 # p_is_active
            None,                 # p_is_verified
            None,                 # p_is_paid
            None,                 # p_is_admin
            None,                 # p_is_content_handler
            None,                 # p_two_fa_enabled
            None,                 # p_locked_only
            None,                 # p_failed_login_min
            'created_at',         # p_order_by
            'DESC',               # p_order_dir
            10,                   # p_limit
            0                     # p_offset
        ]

        rows = call_fn_all(
            cur,
            """
            SELECT * FROM fn_admin_users_list(
                %s::text,
                %s::timestamptz,
                %s::timestamptz,
                %s::boolean,
                %s::boolean,
                %s::boolean,
                %s::boolean,
                %s::boolean,
                %s::boolean,
                %s::boolean,
                %s::int,
                %s::text,
                %s::text,
                %s::int,
                %s::int
            );
            """,
            base_args
        )
        pp("Listing (first 10)", rows[:5])

        # Search by username
        q = users["user1"]["username"].split("_")[0]
        args_q = base_args.copy()
        args_q[0] = q  # p_query
        rows_q = call_fn_all(
            cur,
            """
            SELECT * FROM fn_admin_users_list(
                %s::text,%s::timestamptz,%s::timestamptz,
                %s::boolean,%s::boolean,%s::boolean,%s::boolean,%s::boolean,
                %s::boolean,%s::boolean,%s::int,%s::text,%s::text,%s::int,%s::int
            );
            """,
            args_q
        )
        pp(f"Search by query '{q}'", rows_q)

        # Admin only
        args_admin = base_args.copy()
        args_admin[6] = True  # p_is_admin (índice 6)
        rows_admin = call_fn_all(
            cur,
            """
            SELECT * FROM fn_admin_users_list(
                %s::text,%s::timestamptz,%s::timestamptz,
                %s::boolean,%s::boolean,%s::boolean,%s::boolean,%s::boolean,
                %s::boolean,%s::boolean,%s::int,%s::text,%s::text,%s::int,%s::int
            );
            """,
            args_admin
        )
        pp("Admins only", rows_admin)

        # Lock user1 -> locked_only TRUE
        cur.execute(
            "UPDATE users SET locked_until = now() + interval '1 hour' WHERE id = %s RETURNING id, locked_until;",
            (users["user1"]["id"],)
        )
        pp("Locked user1 until", cur.fetchone())

        args_locked = base_args.copy()
        args_locked[9] = True  # p_locked_only (índice 9)
        rows_locked = call_fn_all(
            cur,
            """
            SELECT * FROM fn_admin_users_list(
                %s::text,%s::timestamptz,%s::timestamptz,
                %s::boolean,%s::boolean,%s::boolean,%s::boolean,%s::boolean,
                %s::boolean,%s::boolean,%s::int,%s::text,%s::text,%s::int,%s::int
            );
            """,
            args_locked
        )
        pp("Locked only", rows_locked)

        # failed_login_min >= 5
        cur.execute(
            "UPDATE users SET failed_login_attempts = 7 WHERE id = %s RETURNING id, failed_login_attempts;",
            (users["user1"]["id"],)
        )
        pp("Bumped failed_login_attempts", cur.fetchone())

        args_failed = base_args.copy()
        args_failed[10] = 5  # p_failed_login_min (índice 10)
        rows_failed = call_fn_all(
            cur,
            """
            SELECT * FROM fn_admin_users_list(
                %s::text,%s::timestamptz,%s::timestamptz,
                %s::boolean,%s::boolean,%s::boolean,%s::boolean,%s::boolean,
                %s::boolean,%s::boolean,%s::int,%s::text,%s::text,%s::int,%s::int
            );
            """,
            args_failed
        )
        pp("Failed_login_attempts >= 5", rows_failed)

        # Counters
        counters = call_fn_one(
            cur,
            "SELECT * FROM fn_admin_users_counters(%s::int);",
            (5,)
        )
        pp("Counters", counters)

def test_detail(conn, users):
    with conn.cursor(row_factory=dict_row) as cur:
        log("2) DETALLE DE USUARIO (+ TOKENS Y SESSIONS)")
        seed_tokens_for_user(cur, users["user1"]["id"])
        conn.commit()

        detail = call_fn_one(
            cur,
            "SELECT * FROM fn_admin_user_detail(%s::int);",
            (users["user1"]["id"],)
        )
        pp("User1 detail", detail)

def test_edits(conn, users):
    with conn.cursor(row_factory=dict_row) as cur:
        log("3) EDICIÓN DE FLAGS Y ESTADO")

        uid = users["user1"]["id"]

        # is_active toggle
        call_fn_one(cur, "SELECT fn_admin_user_set_active(%s::int, %s::boolean);", (uid, False))
        cur.execute("SELECT id, is_active FROM users WHERE id = %s;", (uid,))
        pp("Set is_active = FALSE", cur.fetchone())

        call_fn_one(cur, "SELECT fn_admin_user_set_active(%s::int, %s::boolean);", (uid, True))
        cur.execute("SELECT id, is_active FROM users WHERE id = %s;", (uid,))
        pp("Set is_active = TRUE", cur.fetchone())

        # is_verified
        call_fn_one(cur, "SELECT fn_admin_user_set_verified(%s::int, %s::boolean);", (uid, True))
        cur.execute("SELECT id, is_verified FROM users WHERE id = %s;", (uid,))
        pp("Set is_verified = TRUE", cur.fetchone())

        # is_paid
        call_fn_one(cur, "SELECT fn_admin_user_set_paid(%s::int, %s::boolean);", (uid, True))
        cur.execute("SELECT id, is_paid FROM users WHERE id = %s;", (uid,))
        pp("Set is_paid = TRUE", cur.fetchone())

        # is_content_handler
        call_fn_one(cur, "SELECT fn_admin_user_set_content_handler(%s::int, %s::boolean);", (uid, True))
        cur.execute("SELECT id, is_content_handler FROM users WHERE id = %s;", (uid,))
        pp("Set is_content_handler = TRUE", cur.fetchone())

        # Admin role safeguard tests
        call_fn_one(cur, "SELECT fn_admin_user_set_admin(%s::int, %s::boolean);", (users["admin2"]["id"], False))
        cur.execute("SELECT id, username, is_admin FROM users WHERE id = %s;", (users["admin2"]["id"],))
        pp("Admin2 set to is_admin = FALSE", cur.fetchone())

        # *** SAVEPOINT para la llamada que DEBE fallar ***
        cur.execute("SAVEPOINT sp_last_admin;")
        try:
            call_fn_one(cur, "SELECT fn_admin_user_set_admin(%s::int, %s::boolean);", (users["admin1"]["id"], False))
            print("ERROR: Expected last-admin safeguard to raise an exception, but it did not.")
            # si no falló (raro), liberamos el savepoint
            cur.execute("RELEASE SAVEPOINT sp_last_admin;")
        except psycopg.Error as e:
            print("Expected safeguard fired when trying to remove the last admin:")
            print(f"  {e}")
            # recupera el estado de la transacción sin perder el resto
            cur.execute("ROLLBACK TO SAVEPOINT sp_last_admin;")
            cur.execute("RELEASE SAVEPOINT sp_last_admin;")

        # Restaurar admin2
        call_fn_one(cur, "SELECT fn_admin_user_set_admin(%s::int, %s::boolean);", (users["admin2"]["id"], True))
        cur.execute("SELECT id, username, is_admin FROM users WHERE id = %s;", (users["admin2"]["id"],))
        pp("Admin2 restored to is_admin = TRUE", cur.fetchone())


def main():
    parser = argparse.ArgumentParser(description="Test 'Servicio de Gestión de Usuarios' SQL functions.")
    parser.add_argument("--db", default=DEFAULT_DB_URL, help="PostgreSQL DATABASE_URL")
    args = parser.parse_args()

    print(f"Using DB: {args.db}")

    with psycopg.connect(args.db, row_factory=dict_row) as conn:
        conn.autocommit = False

        # 🔑 Importante: asegurar que resolvemos funciones en el esquema 'content'
        with conn.cursor() as cur:
            cur.execute("SET search_path TO content, public;")

        users = None
        try:
            with conn.cursor(row_factory=dict_row) as cur:
                log("SETUP: creating test users")
                users = create_test_users(cur)
                conn.commit()
                pp("Test users (ids)", {k: v["id"] for k, v in users.items()})

            test_listing_and_counters(conn, users)
            test_detail(conn, users)
            test_edits(conn, users)

        except Exception as e:
            print("\nEXCEPTION DURING TESTS:")
            print(e)
            conn.rollback()
            if users:
                try:
                    with conn.cursor(row_factory=dict_row) as cur:
                        teardown_users(cur, [users["admin1"]["id"], users["admin2"]["id"], users["user1"]["id"]])
                    conn.commit()
                except Exception as e2:
                    print("Cleanup error after failure:", e2)
            raise
        else:
            with conn.cursor(row_factory=dict_row) as cur:
                log("TEARDOWN: deleting test users")
                teardown_users(cur, [users["admin1"]["id"], users["admin2"]["id"], users["user1"]["id"]])
            conn.commit()
            print("\nAll tests finished successfully and cleaned up ✔")

if __name__ == "__main__":
    main()
