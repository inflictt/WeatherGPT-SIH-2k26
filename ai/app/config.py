import os

APP_NAME = "WeatherGPT risk engine"
VERSION = "4.0.0"

# Comma-separated origins allowed to call this service directly. In the normal
# deployment only the Node API talks to it, so the default is deliberately tight.
CORS_ORIGINS = [
    o.strip()
    for o in os.getenv("AI_CORS_ORIGINS", "http://localhost:5000,http://127.0.0.1:5000").split(",")
    if o.strip()
]
HOST = os.getenv("AI_HOST", "127.0.0.1")
PORT = int(os.getenv("AI_PORT", "8000"))
