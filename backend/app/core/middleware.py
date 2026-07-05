import time
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

logger = logging.getLogger("app.middleware")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.time()
        client_host = request.client.host if request.client else "unknown"
        
        logger.debug(f"Request started: {request.method} {request.url.path} from {client_host}")
        
        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            
            # Inject timing header
            response.headers["X-Process-Time"] = f"{process_time:.4f}s"
            
            logger.info(
                f"Request completed: {request.method} {request.url.path} "
                f"| Status: {response.status_code} | Duration: {process_time:.4f}s"
            )
            return response
        except Exception as e:
            process_time = time.time() - start_time
            logger.error(
                f"Request crashed: {request.method} {request.url.path} "
                f"| Exception: {str(e)} | Duration: {process_time:.4f}s"
            )
            raise e
