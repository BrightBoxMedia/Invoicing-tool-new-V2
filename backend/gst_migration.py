#!/usr/bin/env python3
"""
GST Migration Script
Migrates existing projects to include GST configuration fields
"""

import asyncio
import sys
import os
from datetime import datetime, timezone

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from motor.motor_asyncio import AsyncIOMotorClient
from config import MONGO_URL

async def migrate_projects_gst():
    """Add GST configuration to existing projects"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.invoicing_tool
    
    try:
        print("🚀 Starting GST migration for existing projects...")
        
        # Find all projects without GST configuration
        projects_to_update = await db.projects.find({
            "$or": [
                {"gst_type": {"$exists": False}},
                {"gst_approval_status": {"$exists": False}}
            ]
        }).to_list(None)
        
        print(f"📊 Found {len(projects_to_update)} projects needing GST configuration")
        
        if len(projects_to_update) == 0:
            print("✅ All projects already have GST configuration")
            return
        
        # Update each project with default GST settings
        updated_count = 0
        for project in projects_to_update:
            update_data = {
                "gst_type": "IGST",  # Default to IGST as specified
                "gst_approval_status": "approved",  # Approve existing projects automatically
                "gst_approved_by": "system_migration",
                "gst_approved_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            
            # Also fix ra_percentage to ra_bill_percentage if exists
            if "ra_percentage" in project and "ra_bill_percentage" not in project:
                update_data["ra_bill_percentage"] = project["ra_percentage"]
                update_data["$unset"] = {"ra_percentage": ""}
            
            result = await db.projects.update_one(
                {"id": project["id"]}, 
                {"$set": update_data}
            )
            
            if result.modified_count > 0:
                updated_count += 1
                print(f"✅ Updated project: {project.get('project_name', 'Unknown')}")
        
        print(f"🎉 GST migration completed! Updated {updated_count} projects")
        print("📋 All existing projects now have:")
        print("   • GST Type: IGST (default)")
        print("   • GST Approval Status: Approved (auto-approved)")
        print("   • Ready for invoice creation")
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        raise
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(migrate_projects_gst())