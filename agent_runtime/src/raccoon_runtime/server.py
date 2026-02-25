"""gRPC server entry point."""

import asyncio
from concurrent import futures

import grpc
import structlog

from raccoon_runtime.config import Settings

logger = structlog.get_logger()


async def serve(settings: Settings) -> None:
    """Start the async gRPC server."""
    server = grpc.aio.server(
        futures.ThreadPoolExecutor(max_workers=settings.max_workers),
        options=[
            ("grpc.max_send_message_length", settings.max_message_size),
            ("grpc.max_receive_message_length", settings.max_message_size),
        ],
    )

    listen_addr = f"[::]:{settings.grpc_port}"
    server.add_insecure_port(listen_addr)

    logger.info("starting_grpc_server", address=listen_addr)
    await server.start()
    logger.info("grpc_server_started", port=settings.grpc_port)
    await server.wait_for_termination()


def main() -> None:
    """Configure logging and run the gRPC server."""
    settings = Settings()
    structlog.configure(
        processors=[
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ]
    )
    asyncio.run(serve(settings))
