import os
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
MOCK_AGENTS = os.getenv("MOCK_AGENTS", "true").lower() == "true"
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_TEMPERATURE = float(os.getenv("OPENAI_TEMPERATURE", "0.7"))
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

# Data processing
DUPLICATE_VENDOR_THRESHOLD = 0.75
TOP_VENDORS_LIMIT = 10
VENDOR_BUCKET_SIZE = 8

# Agent thinking step delays
THINKING_STEP_BASE_DELAY = 0.8
THINKING_STEP_JITTER = 10
