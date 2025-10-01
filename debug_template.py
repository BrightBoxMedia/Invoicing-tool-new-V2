#!/usr/bin/env python3
"""
Debug PDF Template Manager
"""

import asyncio
import motor.motor_asyncio
import os

async def debug_template_manager():
    # Connect to MongoDB
    MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
    client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
    db = client.activus_invoice_db
    
    # Test collection access
    collection = db.pdf_templates
    print(f"Collection type: {type(collection)}")
    print(f"Collection: {collection}")
    
    # Test if collection is None
    print(f"Collection is None: {collection is None}")
    print(f"Collection is not None: {collection is not None}")
    
    # Test hasattr
    print(f"Has db attribute: {hasattr(collection, 'find_one')}")
    
    # Try to use the collection
    try:
        result = await collection.find_one({"id": "test"})
        print(f"Query result: {result}")
    except Exception as e:
        print(f"Query error: {e}")
    
    # Test boolean evaluation
    try:
        if collection:
            print("Collection evaluates to True")
        else:
            print("Collection evaluates to False")
    except Exception as e:
        print(f"Boolean evaluation error: {e}")

if __name__ == "__main__":
    asyncio.run(debug_template_manager())