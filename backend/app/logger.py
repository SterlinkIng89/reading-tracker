import logging
import sys


def configure_logging():
    import os
    from logging.handlers import RotatingFileHandler

    log_dir = "logs"
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),
            RotatingFileHandler(
                os.path.join(log_dir, "app.log"),
                maxBytes=10 * 1024 * 1024,
                backupCount=5,
                encoding="utf-8",
            ),
        ],
    )


def get_logger(name: str):
    return logging.getLogger(name)
