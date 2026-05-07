# ---- Base: slim for small image
FROM python:3.10-slim

# Environment for reliable logs & no .pyc
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# (Optional) install minimal runtime libs that Pillow may use
# Most wheels are manylinux and won't need build tools.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libjpeg62-turbo libpng16-16 zlib1g ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Workdir
WORKDIR /app

# Copy only requirements first (better build cache)
COPY requirements.txt /app/requirements.txt

# Install Python deps
RUN pip install --upgrade pip && \
    pip install -r /app/requirements.txt

# Copy application code
COPY . /app

# Include your dev .env inside the image (per your request)
# ⚠️ This is fine for local/dev ONLY.
COPY .env /app/.env

# Expose API port
EXPOSE 8000

# Run the app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8005"]
