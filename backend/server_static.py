#!/usr/bin/env python3
"""
Modified server.py for AWS App Runner deployment
Serves both API and static React files
"""

import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn

# Import your existing server code (assuming your server.py has 'app' defined)
try:
    from server import app, api_router
except ImportError:
    # If import fails, create basic app
    from fastapi import FastAPI
    app = FastAPI()

# Serve React static files if they exist
static_dir = "static"
if os.path.exists(static_dir):
    # Mount static files
    app.mount("/static", StaticFiles(directory=static_dir), name="static")
    
    # Serve index.html for root
    @app.get("/")
    async def read_index():
        return FileResponse(os.path.join(static_dir, 'index.html'))
    
    # Catch-all route for SPA (Single Page Application)
    @app.get("/{path:path}")
    async def serve_spa(path: str):
        # Check if it's an API route
        if path.startswith("api/"):
            # Let FastAPI handle API routes normally
            return {"error": "API endpoint not found"}
        
        # For static files, serve them directly
        file_path = os.path.join(static_dir, path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        
        # For all other routes, serve index.html (SPA routing)
        return FileResponse(os.path.join(static_dir, 'index.html'))

# Override the original server.py startup if this file is run directly
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)