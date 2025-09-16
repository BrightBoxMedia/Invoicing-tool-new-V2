"""
Firebase Functions entry point for Activus Invoice Management System
"""
import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from firebase_functions import https_fn
from server import app

@https_fn.on_request()
def api(req: https_fn.Request) -> https_fn.Response:
    """Firebase Function wrapper for FastAPI app"""
    return app(req.environ, lambda status, headers: None)