"""
Vercel serverless entry point for the Activus Invoice Management System
"""
from server import app

# Export the FastAPI app for Vercel
handler = app