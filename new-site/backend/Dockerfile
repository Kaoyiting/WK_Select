FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY --from=ghcr.io/astral-sh/uv:0.9.5 /uv /usr/local/bin/uv
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY . .
RUN useradd -m app && mkdir -p /app/uploads && chown app:app /app/uploads
USER app
ENV PATH="/app/.venv/bin:$PATH"
CMD ["uvicorn","app.main:app","--host","0.0.0.0","--port","8000"]
