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

# Import your existing server code
from server import app, api_router

# Serve React static files
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")
    
    @app.get("/")
    async def read_index():
        return FileResponse('static/index.html')
    
    @app.get("/{path:path}")
    async def serve_spa(path: str):
        # Serve static files or index.html for SPA routing
        file_path = f"static/{path}"
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        else:
            return FileResponse('static/index.html')

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)