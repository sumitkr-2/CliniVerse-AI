import logging
import sys


def setup_logging(env: str = "production", log_level: str = "INFO") -> None:
    level = getattr(logging, log_level.upper(), logging.INFO)
    
    if env == "development":
        format_str = "%(levelname)s:     %(asctime)s [%(name)s:%(lineno)d] %(message)s"
    else:
        format_str = "[%(asctime)s] %(levelname)s [%(name)s:%(filename)s:%(lineno)d] - %(message)s"
        
    formatter = logging.Formatter(format_str)
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(level)
    
    # Root logger setup
    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    root_logger.handlers = []
    root_logger.addHandler(console_handler)
    
    # Adjust severity levels of third-party libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("alembic").setLevel(logging.INFO)
