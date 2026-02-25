FROM python:3.12-slim AS builder
WORKDIR /app
RUN pip install uv
COPY pyproject.toml uv.lock* ./
RUN uv sync --frozen --no-dev

FROM python:3.12-slim
WORKDIR /app
COPY --from=builder /app/.venv /app/.venv
COPY src/ ./src/
COPY protos/ ./protos/

ENV PATH="/app/.venv/bin:$PATH"
ENV RACCOON_GRPC_PORT=50051

EXPOSE 50051
CMD ["python", "-m", "raccoon_runtime"]
