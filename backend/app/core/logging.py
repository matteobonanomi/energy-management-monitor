"""Structured logging setup for the backend runtime.

Logging is configured centrally so every layer emits the same JSON-friendly
shape, which keeps local debugging and container logs easier to correlate.
"""

import logging
import sys

import structlog


def configure_logging(log_level: str) -> None:
    """Apply one logging policy early so downstream modules do not diverge."""
    timestamper = structlog.processors.TimeStamper(fmt="iso", utc=True)

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.stdlib.add_log_level,
            timestamper,
            structlog.processors.dict_tracebacks,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, log_level.upper(), logging.INFO),
    )
