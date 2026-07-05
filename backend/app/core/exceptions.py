import logging
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("app.exceptions")


class AppException(Exception):
    """Base application exception for custom domain errors."""
    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST, code: str = "BAD_REQUEST"):
        self.message = message
        self.status_code = status_code
        self.code = code
        super().__init__(message)


class EntityNotFoundError(AppException):
    def __init__(self, message: str = "Requested resource was not found"):
        super().__init__(
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND"
        )


class PermissionDeniedError(AppException):
    def __init__(self, message: str = "Permission denied"):
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            code="PERMISSION_DENIED"
        )


# Handlers to register in the FastAPI app
async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    logger.warning(f"AppException handled: {exc.message} | Code: {exc.code} | Path: {request.url.path}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message, "code": exc.code}
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    logger.warning(f"HTTPException handled: {exc.detail} | Path: {request.url.path}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "code": f"HTTP_{exc.status_code}"}
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    errors = exc.errors()
    logger.warning(f"Validation error | Path: {request.url.path} | Errors: {errors}")
    
    # Compile a clear, descriptive validation error details message
    detail_msg = "Request body validation failed"
    if errors:
        first_err = errors[0]
        field_loc = " -> ".join([str(loc) for loc in first_err.get("loc", []) if loc != "body"])
        field_msg = first_err.get("msg", "invalid format")
        if field_loc:
            detail_msg = f"Validation failed for '{field_loc}': {field_msg}"
        else:
            detail_msg = f"Validation failed: {field_msg}"

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": detail_msg,
            "code": "VALIDATION_ERROR",
            "errors": errors
        }
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.critical(f"Unhandled exception crashed handler: {str(exc)} | Path: {request.url.path}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal server error occurred",
            "code": "INTERNAL_SERVER_ERROR"
        }
    )
