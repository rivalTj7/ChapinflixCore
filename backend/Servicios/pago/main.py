# main.py
import os

from fastapi import FastAPI, HTTPException, Header, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import stripe
from datetime import datetime
import logging
from enum import Enum
import time
from metrics import (
    http_requests_total,
    http_request_duration_seconds,
    http_requests_in_progress,
    get_metrics
)


# --- our modules ---
from authkit import add_auth_middleware, auth_optional, auth_required, AuthContext
from db import init_pool, close_pool

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Stripe Configuration
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", "")
PRODUCT_ID = "prod_T6wWACQ9RqAZCI"

app = FastAPI(title="ChapinFlix Stripe Backend")

# --- Auth middleware (reads JWT from cookie or Authorization header and puts it into request.state.auth) ---
add_auth_middleware(app)

# CORS Configuration
# NOTE: We keep "*" for your testing as requested. Since the frontend will send Authorization headers,
# we don't rely on cookies across origins. If you later want cookies, switch allow_origins to the exact origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # keep as-is for your tests
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Middleware para métricas
@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    method = request.method
    endpoint = request.url.path
    
    http_requests_in_progress.labels(method=method, endpoint=endpoint).inc()
    start_time = time.time()
    
    try:
        response = await call_next(request)
        status = response.status_code
    except Exception:
        status = 500
        raise
    finally:
        duration = time.time() - start_time
        http_request_duration_seconds.labels(method=method, endpoint=endpoint).observe(duration)
        http_requests_total.labels(method=method, endpoint=endpoint, status=status).inc()
        http_requests_in_progress.labels(method=method, endpoint=endpoint).dec()
    
    return response
# Endpoint de métricas
@app.get("/metrics")
async def metrics():
    return get_metrics()
# ---- Lifecycle: init/close DB pool ----
@app.on_event("startup")
async def _startup():
    await init_pool()
    logger.info("DB pool initialized")

@app.on_event("shutdown")
async def _shutdown():
    await close_pool()
    logger.info("DB pool closed")

# Pydantic Models
class CreateCustomerRequest(BaseModel):
    email: str
    username: str

class CreateSubscriptionRequest(BaseModel):
    customer_id: str
    price_id: str

class CancelSubscriptionRequest(BaseModel):
    subscription_id: str

class CreateCheckoutSessionRequest(BaseModel):
    username: str
    email: str
    price_id: Optional[str] = None

class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    CANCELED = "canceled"
    PAST_DUE = "past_due"
    UNPAID = "unpaid"
    TRIALING = "trialing"
    PAUSED = "paused"
    INCOMPLETE = "incomplete"

# ---- Helpers: flip is_paid in DB ----
async def set_user_paid(user_id: int, paid: bool):
    """
    Update app.app_users.is_paid flag.
    """
    pool = await init_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE app.app_users SET is_paid = $1, updated_at = now() WHERE id = $2",
            paid,
            user_id,
        )

# Health check endpoint
@app.get("/")
async def health_check():
    return {"status": "healthy", "service": "ChapinFlix Stripe Backend"}

# Get Stripe config for frontend
@app.get("/api/stripe/config")
async def get_stripe_config():
    return {
        "publishable_key": STRIPE_PUBLISHABLE_KEY,
        "product_id": PRODUCT_ID
    }

# Create a new customer (kept for testing)
@app.post("/api/customers/create")
async def create_customer(request: CreateCustomerRequest):
    try:
        customer = stripe.Customer.create(
            email=request.email,
            metadata={"username": request.username}
        )
        return {
            "customer_id": customer.id,
            "email": customer.email,
            "username": request.username
        }
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# Get or create price for the product
@app.get("/api/prices")
async def get_prices():
    try:
        prices = stripe.Price.list(product=PRODUCT_ID, active=True)
        if not prices.data:
            price = stripe.Price.create(
                product=PRODUCT_ID,
                unit_amount=999,  # $9.99
                currency="usd",
                recurring={"interval": "month"}
            )
            return {"prices": [price]}
        return {"prices": prices.data}
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# Create checkout session for subscription
# Auth OPTIONAL: we will include user_id metadata if token is present; otherwise still works for your tests.
@app.post("/api/checkout/session")
async def create_checkout_session(
    request: CreateCheckoutSessionRequest,
    ctx: Optional[AuthContext] = Depends(auth_optional),
):
    try:
        # Get or create customer by email
        customers = stripe.Customer.list(email=request.email, limit=1)
        if customers.data:
            customer = customers.data[0]
            # if we have auth context, ensure customer has user_id metadata saved for later lookup
            if ctx and (not customer.get("metadata") or not customer["metadata"].get("user_id")):
                stripe.Customer.modify(customer["id"], metadata={"user_id": str(ctx.user_id)})
        else:
            metadata = {"username": request.username}
            if ctx:
                metadata["user_id"] = str(ctx.user_id)
            customer = stripe.Customer.create(
                email=request.email,
                metadata=metadata
            )

        # Get price ID if not provided
        if not request.price_id:
            prices = stripe.Price.list(product=PRODUCT_ID, active=True, limit=1)
            if not prices.data:
                price = stripe.Price.create(
                    product=PRODUCT_ID,
                    unit_amount=999,  # $9.99
                    currency="usd",
                    recurring={"interval": "month"}
                )
                price_id = price.id
            else:
                price_id = prices.data[0].id
        else:
            price_id = request.price_id

        # Build subscription_data metadata so the Subscription itself carries user_id
        subscription_data = {}
        if ctx:
            subscription_data = {"metadata": {"user_id": str(ctx.user_id)}}

        # Create checkout session
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price": price_id,
                "quantity": 1
            }],
            mode="subscription",
            customer=customer.id,
            success_url="http://localhost:3000/catalog?session_id={CHECKOUT_SESSION_ID}",
            cancel_url="http://localhost:3000/login",
            metadata={"username": request.username, **({"user_id": str(ctx.user_id)} if ctx else {})},
            subscription_data=subscription_data if subscription_data else None,
        )

        return {
            "checkout_url": session.url,
            "session_id": session.id
        }

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# Create subscription directly (kept for testing)
@app.post("/api/subscriptions/create")
async def create_subscription(request: CreateSubscriptionRequest):
    try:
        subscription = stripe.Subscription.create(
            customer=request.customer_id,
            items=[{"price": request.price_id}],
            payment_behavior="default_incomplete",
            expand=["latest_invoice.payment_intent"]
        )
        return {
            "subscription_id": subscription.id,
            "status": subscription.status,
            "client_secret": subscription.latest_invoice.payment_intent.client_secret if subscription.latest_invoice else None
        }
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# Get subscription status by id (kept for testing)
@app.get("/api/subscriptions/{subscription_id}")
async def get_subscription(subscription_id: str):
    try:
        subscription = stripe.Subscription.retrieve(subscription_id)
        return {
            "id": subscription.id,
            "status": subscription.status,
            "current_period_end": subscription.get("current_period_end"),
            "cancel_at_period_end": subscription.get("cancel_at_period_end"),
        }
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {str(e)}")
        raise HTTPException(status_code=404, detail="Subscription not found")

# Cancel by id (kept; you can later add an auth'd "cancel mine" if desired)
@app.post("/api/subscriptions/cancel")
async def cancel_subscription(request: CancelSubscriptionRequest):
    try:
        subscription = stripe.Subscription.modify(
            request.subscription_id,
            cancel_at_period_end=True
        )
        return {
            "subscription_id": subscription.id,
            "status": "canceled",
            "cancel_at": subscription.get("cancel_at")
        }
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# OLD: Check by email (kept for your tests)
@app.get("/api/subscriptions/check/{email}")
async def check_subscription_status(email: str):
    try:
        customers = stripe.Customer.list(email=email, limit=1)
        if not customers.data:
            return {"has_active_subscription": False}
        customer = customers.data[0]
        subs = stripe.Subscription.list(customer=customer.id, status="active", limit=1)
        if not subs.data:
            return {"has_active_subscription": False}
        sub = subs.data[0]
        payload = {
            "has_active_subscription": True,
            "subscription": {
                "id": sub.get("id"),
                "status": sub.get("status"),
            }
        }
        cpe = sub.get("current_period_end")
        if cpe is not None:
            payload["subscription"]["current_period_end"] = cpe
        return payload
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {str(e)}")
        return {"has_active_subscription": False}

# NEW: Check current user's paid flag FROM DB (and try to enrich with Stripe sub if token has an email)
@app.get("/api/me/subscription")
async def me_subscription(ctx: AuthContext = Depends(auth_required)):
    # 1) read is_paid from DB
    pool = await init_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT is_paid FROM app.app_users WHERE id = $1", ctx.user_id)
        is_paid = bool(row["is_paid"]) if row else False

    result: Dict[str, Any] = {"has_active_subscription": is_paid}

    # Helper to attach sub info into result
    def _attach_sub(sub_obj):
        if not sub_obj:
            return
        result["subscription"] = {
            "id": sub_obj.get("id"),
            "status": sub_obj.get("status"),
        }
        cpe = sub_obj.get("current_period_end")
        if cpe is not None:
            result["subscription"]["current_period_end"] = cpe

    # 2) try to enrich via email in JWT (existing flow)
    email = ctx.payload.get("email")
    try:
        sub_found = None

        if email:
            customers = stripe.Customer.list(email=email, limit=1)
            if customers.data:
                subs = stripe.Subscription.list(customer=customers.data[0].id, status="active", limit=1)
                if subs.data:
                    sub_found = subs.data[0]

        # 3) fallback: Customer.search by metadata['user_id']
        if not sub_found:
            try:
                # requires Search API (available on most accounts)
                cust_search = stripe.Customer.search(
                    query=f"metadata['user_id']:'{ctx.user_id}'",
                    limit=1
                )
                if cust_search.data:
                    subs = stripe.Subscription.list(customer=cust_search.data[0].id, status="active", limit=1)
                    if subs.data:
                        sub_found = subs.data[0]
            except Exception as e:
                logger.warning(f"Customer.search fallback failed: {e}")

        # 4) fallback: Subscription.search by metadata['user_id']
        if not sub_found:
            try:
                sub_search = stripe.Subscription.search(
                    query=f"metadata['user_id']:'{ctx.user_id}' AND status:'active'",
                    limit=1
                )
                if sub_search.data:
                    sub_found = sub_search.data[0]
            except Exception as e:
                logger.warning(f"Subscription.search fallback failed: {e}")

        if sub_found:
            _attach_sub(sub_found)

    except stripe.error.StripeError as e:
        logger.warning(f"Stripe enrich failed for /api/me/subscription: {e}")

    return result


# Webhook endpoint: flips is_paid in DB using metadata.user_id on the Subscription (or Customer) as source of truth
@app.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    payload = await request.body()

    try:
        event = stripe.Webhook.construct_event(payload, stripe_signature, STRIPE_WEBHOOK_SECRET)
        etype = event["type"]
        obj = event["data"]["object"]

        logger.info(f"Webhook received: {etype}")

        async def update_paid_from_subscription(sub_obj: Dict[str, Any]):
            # Prefer subscription.metadata.user_id
            meta = sub_obj.get("metadata") or {}
            uid = meta.get("user_id")

            # Fallback: try reading from the Customer metadata
            if not uid:
                try:
                    cust_id = sub_obj.get("customer")
                    if cust_id:
                        cust = stripe.Customer.retrieve(cust_id)
                        cmeta = cust.get("metadata") or {}
                        uid = cmeta.get("user_id")
                except Exception:
                    pass

            if not uid:
                logger.warning("Webhook cannot map subscription to user_id (missing metadata)")
                return

            try:
                user_id = int(uid)
            except ValueError:
                logger.warning(f"Invalid user_id in metadata: {uid!r}")
                return

            status = sub_obj.get("status")
            # Define when we consider "paid"
            paid_now = status in ("active", "trialing")
            await set_user_paid(user_id, paid_now)
            logger.info(f"Set user {user_id} is_paid={paid_now} (status={status})")

        # Handle event types that affect paid status
        if etype in (
            "customer.subscription.created",
            "customer.subscription.updated",
            "customer.subscription.deleted",
        ):
            await update_paid_from_subscription(obj)

        elif etype == "checkout.session.completed":
            # Not strictly necessary to flip here (subscription events will follow),
            # but we could attempt to set paid if subscription is visible through expand.
            pass

        elif etype in ("invoice.payment_succeeded", "invoice.payment_failed"):
            # Optional: could map to user_id and adjust is_paid more aggressively if desired.
            pass

        return {"status": "success"}

    except ValueError as e:
        logger.error(f"Invalid payload: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Invalid signature: {e}")
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Get all active subscriptions (admin-ish, kept)
@app.get("/api/admin/subscriptions")
async def get_all_subscriptions():
    try:
        subscriptions = stripe.Subscription.list(status="active", limit=100)
        return {
            "subscriptions": [
                {
                    "id": sub.id,
                    "customer_id": sub.customer,
                    "status": sub.status,
                    "current_period_end": sub.get("current_period_end"),
                }
                for sub in subscriptions.data
            ],
            "count": len(subscriptions.data)
        }
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)
