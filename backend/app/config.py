import os

from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
MOCK_AGENTS = os.getenv("MOCK_AGENTS", "true").lower() == "true"
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_TEMPERATURE = float(os.getenv("OPENAI_TEMPERATURE", "0.7"))
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

# Data processing
DUPLICATE_VENDOR_THRESHOLD = 0.88
TOP_VENDORS_LIMIT = 10
VENDOR_BUCKET_SIZE = 8

# Upload security limits
MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "50"))
MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024
MAX_ROWS = int(os.getenv("MAX_ROWS", "500000"))
MAX_COLUMNS = int(os.getenv("MAX_COLUMNS", "200"))
MAX_SESSIONS = int(os.getenv("MAX_SESSIONS", "100"))
DUPLICATE_VENDOR_CAP = 500  # Max vendors to compare for dedup (O(n^2) guard)

# Agent thinking step delays
THINKING_STEP_BASE_DELAY = 0.8
THINKING_STEP_JITTER = 10
