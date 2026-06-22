import os
import sys

# Ensure the backend directory is in the import path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the FastAPI application from our modular app package
from app.main import app
