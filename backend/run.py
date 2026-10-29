import os
import sys
from pathlib import Path

# Ensure root workspace directory is in python sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from backend.app import create_app
from backend.app.config import Config

app = create_app()

if __name__ == "__main__":
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "5000"))
    debug = Config.DEBUG
    print(f"[*] Starting SmartBus AI Backend on http://{host}:{port}")
    app.run(host=host, port=port, debug=debug)
