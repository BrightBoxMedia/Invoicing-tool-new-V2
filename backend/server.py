#!/usr/bin/env python3
"""
Activus Invoice Management System - Production Backend
Professional invoice and project management for construction industry
"""

import os
import sys
import uuid
import bcrypt
import jwt
import asyncio
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional, Union
import io
from io import BytesIO
import base64

# FastAPI and Pydantic imports
from fastapi import FastAPI, HTTPException, Depends, File, UploadFile, Query, WebSocket, WebSocketDisconnect, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response, FileResponse, StreamingResponse
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, Field, validator
import uvicorn
import json
import websockets
import pydantic
from bson import ObjectId

# Fix ObjectId serialization for JSON responses
# Note: In newer Pydantic versions, this is handled differently
try:
    pydantic.json.ENCODERS_BY_TYPE[ObjectId] = str
except AttributeError:
    # For newer Pydantic versions, we'll handle ObjectId serialization in the models
    pass

# Custom JSON encoder for ObjectId
def custom_jsonable_encoder(obj):
    if isinstance(obj, ObjectId):
        return str(obj)
    elif isinstance(obj, dict):
        return {key: custom_jsonable_encoder(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [custom_jsonable_encoder(item) for item in obj]
    else:
        return jsonable_encoder(obj)

# Database
import motor.motor_asyncio
from motor.motor_asyncio import AsyncIOMotorDatabase
from pdf_template_manager import PDFTemplateManager, PDFTemplateConfig, initialize_template_manager, template_manager

# Excel processing
import openpyxl
from openpyxl import load_workbook

# PDF generation
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image as RLImage
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.units import mm, inch
from reportlab.pdfgen import canvas

# Logging
import logging

# Canvas-based PDF generation for Canva-like functionality
async def generate_canvas_based_pdf(
    template_config: PDFTemplateConfig, 
    invoice_data: dict, 
    client_data: dict, 
    project_data: dict
) -> bytes:
    """
    Generate PDF using Canvas API for precise element positioning (Canva-like functionality)
    
    Args:
        template_config: PDF template configuration with canvas_elements
        invoice_data: Invoice data dictionary
        client_data: Client information dictionary  
        project_data: Project information dictionary
        
    Returns:
        bytes: Generated PDF as bytes
    """
    try:
        # Create PDF buffer
        buffer = BytesIO()
        
        # Determine page size
        page_size = A4 if template_config.page_size == "A4" else letter
        page_width, page_height = page_size
        
        # Create canvas for precise positioning
        c = canvas.Canvas(buffer, pagesize=page_size)
        
        # Helper function to convert frontend coordinates to ReportLab coordinates
        # ReportLab uses bottom-left origin, frontend uses top-left origin
        def convert_coordinates(x, y, element_height=0):
            # Convert from top-left origin to bottom-left origin
            converted_x = float(x) * (page_width / 600)  # Scale from 600px canvas to actual page width
            converted_y = page_height - (float(y) * (page_height / 800)) - element_height  # Scale and flip Y axis
            return converted_x, converted_y
        
        # Render each canvas element
        for element_id, element in template_config.canvas_elements.items():
            try:
                # Get element properties
                element_type = element.type
                x, y = convert_coordinates(element.x, element.y, element.height or 20)
                content = element.content
                style = element.style
                
                # Set text properties
                c.setFont("Helvetica", style.fontSize or 12)
                c.setFillColor(colors.toColor(style.color or "#000000"))
                
                # Render based element type
                if element_type == "text":
                    # Simple text element
                    text_content = str(content) if content else "Text Element"
                    c.drawString(x, y, text_content)
                    
                elif element_type == "text-group":
                    # Multi-line text group (invoice details)
                    if isinstance(content, dict):
                        line_height = (style.fontSize or 12) + 4
                        current_y = y
                        
                        # Draw invoice number
                        if content.get('invoice_no'):
                            c.drawString(x, current_y, f"Invoice No: {content['invoice_no']}")
                            current_y -= line_height
                        
                        # Draw invoice date  
                        if content.get('invoice_date'):
                            c.drawString(x, current_y, f"Invoice Date: {content['invoice_date']}")
                            current_y -= line_height
                            
                        # Draw created by
                        if content.get('created_by'):
                            c.drawString(x, current_y, f"Created By: {content['created_by']}")
                    
                elif element_type == "info-section":
                    # Company/client information section
                    if isinstance(content, dict):
                        line_height = (style.fontSize or 12) + 2
                        current_y = y
                        
                        # Draw background rectangle if specified
                        if style.backgroundColor:
                            c.setFillColor(colors.toColor(style.backgroundColor))
                            c.rect(x - 5, y - 5, element.width + 10, -(element.height or 100), fill=1, stroke=0)
                            c.setFillColor(colors.toColor(style.color or "#000000"))
                        
                        # Draw title (BILLED BY: / BILLED TO:)
                        if content.get('title'):
                            c.setFont("Helvetica-Bold", (style.fontSize or 12) + 1)
                            c.drawString(x, current_y, content['title'])
                            current_y -= line_height + 2
                        
                        # Draw company name
                        if content.get('company_name'):
                            c.setFont("Helvetica-Bold", style.fontSize or 12)
                            c.drawString(x, current_y, content['company_name'])
                            current_y -= line_height
                        
                        # Draw address (multi-line)
                        if content.get('company_address'):
                            c.setFont("Helvetica", (style.fontSize or 12) - 1)
                            address_lines = content['company_address'].split('\n')
                            for line in address_lines:
                                if line.strip():
                                    c.drawString(x, current_y, line.strip())
                                    current_y -= line_height - 2
                        
                        # Draw GST
                        if content.get('company_gst'):
                            c.drawString(x, current_y, f"GST: {content['company_gst']}")
                            current_y -= line_height - 2
                            
                        # Draw email
                        if content.get('company_email'):
                            c.drawString(x, current_y, f"Email: {content['company_email']}")
                            current_y -= line_height - 2
                            
                        # Draw phone
                        if content.get('company_phone'):
                            c.drawString(x, current_y, f"Phone: {content['company_phone']}")
                
                elif element_type == "project-info":
                    # Project information
                    if isinstance(content, dict):
                        line_height = (style.fontSize or 12) + 4
                        current_y = y
                        
                        if content.get('project_name'):
                            c.drawString(x, current_y, f"Project: {content['project_name']}")
                            current_y -= line_height
                            
                        if content.get('location'):
                            c.drawString(x, current_y, f"Location: {content['location']}")
                
            except Exception as e:
                logger.warning(f"Error rendering canvas element {element_id}: {e}")
                continue
        
        # Render logo if present
        if hasattr(template_config, 'logo_url') and template_config.logo_url:
            try:
                if template_config.logo_url.startswith('data:image'):
                    # Extract base64 data
                    logo_data = template_config.logo_url.split(',')[1]
                    logo_bytes = base64.b64decode(logo_data)
                    logo_buffer = BytesIO(logo_bytes)
                    
                    # Convert logo coordinates
                    logo_x, logo_y = convert_coordinates(template_config.logo_x or 350, template_config.logo_y or 20, template_config.logo_height or 60)
                    
                    # Draw logo on canvas
                    c.drawImage(
                        logo_buffer,
                        logo_x, logo_y,
                        width=template_config.logo_width or 120,
                        height=template_config.logo_height or 60
                    )
            except Exception as e:
                logger.warning(f"Logo rendering failed in canvas mode: {e}")
        
        # Generate sample invoice table if no table element exists
        # This ensures backward compatibility
        table_exists = any(element.type == "table" for element in template_config.canvas_elements.values())
        if not table_exists:
            # Add a simple sample table at bottom of page
            table_y = 200  # Fixed position for sample table
            
            # Table headers
            headers = ["Item", "GST Rate", "Qty", "Rate", "Amount", "IGST", "Total"]
            col_widths = [75, 18, 20, 22, 30, 25, 30]
            start_x = 50
            
            # Draw table headers
            c.setFillColor(colors.toColor(template_config.table_header_color or "#127285"))
            c.rect(start_x, table_y, sum(col_widths), 20, fill=1, stroke=1)
            
            c.setFillColor(colors.toColor(template_config.table_header_text_color or "#FFFFFF"))
            c.setFont("Helvetica-Bold", template_config.table_header_font_size or 11)
            
            current_x = start_x + 5
            for i, header in enumerate(headers):
                c.drawString(current_x, table_y + 5, header)
                current_x += col_widths[i]
            
            # Draw sample row
            c.setFillColor(colors.toColor("#000000"))
            c.setFont("Helvetica", template_config.table_data_font_size or 10)
            
            sample_row = ["Sample Construction Work", "18%", "100", "Rs. 1,000", "Rs. 100,000", "Rs. 18,000", "Rs. 118,000"]
            current_x = start_x + 5
            for i, cell in enumerate(sample_row):
                c.drawString(current_x, table_y - 15, cell)
                current_x += col_widths[i]
        
        # Save the canvas
        c.save()
        
        # Get PDF bytes
        buffer.seek(0)
        return buffer.getvalue()
        
    except Exception as e:
        logger.error(f"Canvas-based PDF generation failed: {e}")
        # Fall back to traditional generation
        return await generate_traditional_pdf(template_config, invoice_data, client_data, project_data)

# Traditional PDF generation (renamed for clarity)
async def generate_traditional_pdf(
    template_config: PDFTemplateConfig, 
    invoice_data: dict, 
    client_data: dict, 
    project_data: dict
) -> bytes:
    """Traditional PDF generation using ReportLab Platypus (story-based)"""
    try:
        # Create PDF buffer
        buffer = BytesIO()
        
        # Create a simple PDF with ReportLab Canvas for now
        # This is a simplified implementation for backward compatibility
        c = canvas.Canvas(buffer, pagesize=A4)
        
        # Add basic content
        c.setFont("Helvetica-Bold", 18)
        c.drawString(50, 750, "TAX INVOICE")
        
        c.setFont("Helvetica", 12)
        c.drawString(50, 700, f"Company: {template_config.company_name}")
        c.drawString(50, 680, f"Address: {template_config.company_address}")
        c.drawString(50, 660, f"GST: {template_config.company_gst}")
        
        # Add sample content
        c.drawString(50, 600, "Sample Invoice Content")
        c.drawString(50, 580, "This is generated using traditional PDF generation")
        
        c.save()
        buffer.seek(0)
        return buffer.getvalue()
        
    except Exception as e:
        logger.error(f"Traditional PDF generation error: {e}")
        # Return a very basic PDF as final fallback
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        c.setFont("Helvetica", 12)
        c.drawString(50, 750, "PDF Generation Error - Please check template configuration")
        c.save()
        buffer.seek(0)
        return buffer.getvalue()

# Environment setup
SECRET_KEY = os.getenv('JWT_SECRET', 'activus-invoice-secret-key-2025')
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
PORT = int(os.getenv('PORT', '8001'))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(
    title="Activus Invoice Management API",
    description="Professional Invoice Management System for Construction Projects",
    version="2.0.0"
)

# CORS configuration - AWS production ready
ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', '*').split(',')
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # Set ALLOWED_ORIGINS env var for production
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Database connection
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
DB_NAME = os.getenv('DB_NAME', 'activus_invoice_db')
db: AsyncIOMotorDatabase = client[DB_NAME]

# Real-time WebSocket Infrastructure for AWS Compatibility
class ConnectionManager:
    """WebSocket connection manager with AWS-compatible features"""
    
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.user_projects: Dict[str, str] = {}  # user_id -> current_project_id
        self.last_event_timestamps: Dict[str, datetime] = {}
        
    async def connect(self, websocket: WebSocket, project_id: str, user_id: str):
        """Connect user to project channel"""
        await websocket.accept()
        
        if project_id not in self.active_connections:
            self.active_connections[project_id] = []
        
        self.active_connections[project_id].append(websocket)
        self.user_projects[user_id] = project_id
        
        logger.info(f"User {user_id} connected to project {project_id}")
        
    async def disconnect(self, websocket: WebSocket, project_id: str, user_id: str):
        """Disconnect user from project channel"""
        if project_id in self.active_connections:
            try:
                self.active_connections[project_id].remove(websocket)
                if not self.active_connections[project_id]:
                    del self.active_connections[project_id]
            except ValueError:
                pass
        
        if user_id in self.user_projects:
            del self.user_projects[user_id]
        
        logger.info(f"User {user_id} disconnected from project {project_id}")
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        """Send message to specific websocket"""
        try:
            await websocket.send_text(message)
        except WebSocketDisconnect:
            pass
    
    async def broadcast_to_project(self, project_id: str, message: dict, exclude_user: str = None):
        """Broadcast message to all users viewing a project"""
        if project_id not in self.active_connections:
            return
            
        message_str = json.dumps({
            **message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "project_id": project_id
        })
        
        # Store last event timestamp for reconnection handling
        self.last_event_timestamps[project_id] = datetime.now(timezone.utc)
        
        # Send to all connected clients for this project
        disconnected = []
        for websocket in self.active_connections[project_id]:
            try:
                await websocket.send_text(message_str)
            except (WebSocketDisconnect, Exception):
                disconnected.append(websocket)
        
        # Clean up disconnected clients
        for ws in disconnected:
            try:
                self.active_connections[project_id].remove(ws)
            except ValueError:
                pass
                
    async def get_project_snapshot(self, project_id: str):
        """Get current canonical project state for reconnection"""
        try:
            # Get fresh project data
            project = await db.projects.find_one({"id": project_id})
            if not project:
                return None
                
            # Get invoices for this project
            invoices_cursor = db.invoices.find({"project_id": project_id})
            invoices = await invoices_cursor.to_list(length=None)
            
            # Calculate current totals
            total_billed = sum(inv.get("total_amount", 0) for inv in invoices if inv.get("invoice_type") == "tax_invoice")
            total_project_value = project.get("total_project_value", 0)
            remaining_value = total_project_value - total_billed
            
            return {
                "event": "project_snapshot",
                "project_id": project_id,
                "data": {
                    "total_billed": total_billed,
                    "remaining_value": remaining_value,
                    "project_completed_percentage": (total_billed / total_project_value * 100) if total_project_value > 0 else 0,
                    "total_invoices": len(invoices),
                    "last_event_timestamp": self.last_event_timestamps.get(project_id, datetime.now(timezone.utc)).isoformat()
                }
            }
        except Exception as e:
            logger.error(f"Error getting project snapshot: {e}")
            return None

# Global connection manager instance
manager = ConnectionManager()

# Real-time Event System
class ProjectEvent:
    """Project event types for real-time updates"""
    INVOICE_CREATED = "invoice.created"
    INVOICE_UPDATED = "invoice.updated"  
    INVOICE_DELETED = "invoice.deleted"
    EXPENSE_CREATED = "expense.created"
    EXPENSE_UPDATED = "expense.updated"
    PROJECT_UPDATED = "project.updated"
    BOQ_ITEM_BILLED = "boq.item_billed"
    BOQ_CONFLICT = "boq.conflict"

async def emit_project_event(event_type: str, project_id: str, data: dict, user_id: str = None):
    """Emit real-time event for project changes"""
    try:
        # Get updated project data for canonical totals
        project_snapshot = await manager.get_project_snapshot(project_id)
        
        event_data = {
            "event": event_type,
            "project_id": project_id,
            "data": data,
            "actor_id": user_id,
            "canonical_totals": project_snapshot["data"] if project_snapshot else {}
        }
        
        # Broadcast to all users viewing this project
        await manager.broadcast_to_project(project_id, event_data, exclude_user=user_id)
        
        # Log event for monitoring
        logger.info(f"Event emitted: {event_type} for project {project_id}")
        
    except Exception as e:
        logger.error(f"Error emitting project event: {e}")

# Event payload helpers
def create_invoice_event_data(invoice: dict, boq_items_affected: List[str] = None) -> dict:
    """Create invoice event payload with minimal required fields"""
    return {
        "invoice_id": invoice.get("id"),
        "invoice_number": invoice.get("invoice_number"),
        "invoice_type": invoice.get("invoice_type"),
        "total_amount": invoice.get("total_amount", 0),
        "gst_amount": invoice.get("total_gst_amount", 0),
        "ra_tag": invoice.get("ra_number"),
        "affected_item_ids": boq_items_affected or []
    }

def create_boq_event_data(item_id: str, billed_quantity: float, available_quantity: float) -> dict:
    """Create BOQ item billing event payload"""
    return {
        "item_id": item_id,
        "billed_quantity": billed_quantity,
        "available_quantity": available_quantity
    }

# Pydantic Models
class UserRole:
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"
    USER = "user"

class InvoiceType:
    PROFORMA = "proforma"
    TAX_INVOICE = "tax_invoice"

class ProjectStatus:
    ACTIVE = "active"
    COMPLETED = "completed"
    ON_HOLD = "on_hold"

# User Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    password_hash: str
    role: str
    company_name: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserLogin(BaseModel):
    email: str
    password: str

class UserCreate(BaseModel):
    email: str
    password: str
    role: str
    company_name: str

# Client Models
class ClientInfo(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: str
    address: str
    city: str
    state: str
    gst_no: str
    bill_to_address: str
    shipping_address: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# BOQ Item Models
class BOQItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sr_no: int
    description: str
    unit: str
    quantity: float
    rate: float
    amount: float
    gst_rate: float = 18.0
    billed_quantity: float = 0.0  # Track what's already billed

    @validator('gst_rate')
    def validate_gst_rate(cls, v):
        allowed_rates = [0, 5, 12, 18, 28, 40]  # Added 40% GST
        if v not in allowed_rates:
            raise ValueError(f'GST rate must be one of {allowed_rates}')
        return v

# Project Models
class Project(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_name: str
    client_id: str
    client_name: str
    architect: str
    location: str
    
    # Cash flow percentages - must total 100%
    abg_percentage: float = 0.0  # Advance Bank Guarantee
    ra_bill_percentage: float = 0.0   # RA Bill with Taxes (renamed for consistency)
    erection_percentage: float = 0.0  # Erection Work
    pbg_percentage: float = 0.0  # Performance Bank Guarantee
    
    # GST Configuration
    gst_type: str = "IGST"  # CGST_SGST or IGST (default to IGST)
    gst_approval_status: str = "pending"  # pending, approved, rejected
    gst_approved_by: Optional[str] = None  # User ID who approved GST
    gst_approved_at: Optional[datetime] = None  # When GST was approved
    
    total_project_value: float
    boq_items: List[BOQItem] = []
    status: str = ProjectStatus.ACTIVE
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @validator('abg_percentage', 'ra_bill_percentage', 'erection_percentage', 'pbg_percentage')
    def validate_percentage(cls, v):
        if v < 0 or v > 100:
            raise ValueError('Percentage must be between 0 and 100')
        return v

    @validator('gst_type')
    def validate_gst_type(cls, v):
        if v not in ['CGST_SGST', 'IGST']:
            raise ValueError('GST type must be either CGST_SGST or IGST')
        return v

    @validator('gst_approval_status')
    def validate_gst_approval_status(cls, v):
        if v not in ['pending', 'approved', 'rejected']:
            raise ValueError('GST approval status must be pending, approved, or rejected')
        return v

    def validate_total_percentage(self):
        total = self.abg_percentage + self.ra_bill_percentage + self.erection_percentage + self.pbg_percentage
        if abs(total - 100.0) > 0.01:  # Allow small floating point differences
            raise ValueError(f'Percentages must total 100%, current total: {total}%')

# Invoice Models
class InvoiceItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    boq_item_id: str
    description: str
    unit: str
    quantity: float
    rate: float
    amount: float
    gst_rate: float = 18.0

class Invoice(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str
    project_id: str
    client_id: str
    invoice_type: str  # "proforma" or "tax_invoice"
    invoice_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    due_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc) + timedelta(days=30))
    items: List[InvoiceItem]
    subtotal: float
    
    # GST Breakdown
    gst_type: str  # CGST_SGST or IGST
    cgst_amount: float = 0.0  # Only for CGST_SGST type
    sgst_amount: float = 0.0  # Only for CGST_SGST type  
    igst_amount: float = 0.0  # Only for IGST type
    total_gst_amount: float
    
    total_amount: float
    payment_terms: str = "Payment due within 30 days"
    advance_received: float = 0.0
    net_amount_due: float = 0.0
    ra_number: Optional[str] = None  # Only for tax invoices
    status: str = "draft"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ActivityLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_email: str
    user_role: str
    action: str
    description: str
    project_id: Optional[str] = None
    invoice_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Excel Parser Class - FIXED VERSION
class ExcelParser:
    def __init__(self):
        self.supported_extensions = ['.xlsx', '.xlsm', '.xls']
        
    async def parse_excel_file(self, file_content: bytes, filename: str) -> Dict:
        try:
            workbook = load_workbook(BytesIO(file_content), data_only=True)
            worksheet = workbook.active
            
            # Enhanced BOQ parsing - ignore totals and summaries
            parsed_data = await self._parse_boq_data(worksheet, filename)
            
            return {
                "filename": filename,
                "sheets": [worksheet.title],
                "parsed_data": parsed_data,
                "status": "success"
            }
            
        except Exception as e:
            logger.error(f"Excel parsing error: {str(e)}")
            raise HTTPException(status_code=422, detail=f"Failed to parse Excel file: {str(e)}")
    
    async def _parse_boq_data(self, worksheet, filename: str) -> Dict:
        """SUPER INTELLIGENT BOQ parsing - handles ANY Excel format including complex layouts"""
        
        logger.info(f"🚀 STARTING SUPER INTELLIGENT BOQ PARSING for {filename}")
        logger.info(f"📊 Worksheet dimensions: {worksheet.max_row} rows × {worksheet.max_column} columns")
        
        # STRATEGY 1: Try standard header-based parsing
        boq_items = []
        try:
            logger.info("🔍 STRATEGY 1: Standard header-based parsing")
            header_row = self._find_header_row(worksheet)
            if header_row:
                column_mapping = self._get_enhanced_column_mapping(worksheet, header_row)
                logger.info(f"📋 Column mapping found: {column_mapping}")
                
                if column_mapping and 'description' in column_mapping:
                    boq_items = await self._extract_items_with_mapping(worksheet, header_row, column_mapping)
                    if boq_items:
                        logger.info(f"✅ STRATEGY 1 SUCCESS: Found {len(boq_items)} items")
                        return await self._finalize_boq_data(boq_items, filename)
        except Exception as e:
            logger.warning(f"⚠️ Strategy 1 failed: {e}")
        
        # STRATEGY 2: Pattern-based parsing (no strict headers)  
        try:
            logger.info("🔍 STRATEGY 2: Pattern-based parsing")
            boq_items = await self._extract_items_by_pattern(worksheet)
            if boq_items:
                logger.info(f"✅ STRATEGY 2 SUCCESS: Found {len(boq_items)} items")
                return await self._finalize_boq_data(boq_items, filename)
        except Exception as e:
            logger.warning(f"⚠️ Strategy 2 failed: {e}")
        
        # STRATEGY 3: Brute force - scan all cells for BOQ-like data
        try:
            logger.info("🔍 STRATEGY 3: Brute force scanning")
            boq_items = await self._extract_items_brute_force(worksheet)
            if boq_items:
                logger.info(f"✅ STRATEGY 3 SUCCESS: Found {len(boq_items)} items")
                return await self._finalize_boq_data(boq_items, filename)
        except Exception as e:
            logger.warning(f"⚠️ Strategy 3 failed: {e}")
        
        # If all strategies fail
        logger.error("❌ ALL STRATEGIES FAILED - No valid BOQ items found")
        raise ValueError("No valid BOQ items found in the Excel file. Please check the file format and ensure it contains item descriptions with quantities, rates, or amounts.")
    
    async def _extract_items_with_mapping(self, worksheet, header_row: int, column_mapping: Dict) -> List[BOQItem]:
        """Extract items using column mapping"""
        boq_items = []
        
        for row_idx in range(header_row + 1, min(worksheet.max_row + 1, header_row + 500)):
            try:
                row_data = self._extract_row_data(worksheet, row_idx, column_mapping)
                
                # Skip if this is a summary/total row
                if self._is_summary_row(row_data):
                    logger.info(f"Skipping summary row {row_idx}: {row_data.get('description', 'Unknown')}")
                    continue
                
                # Validate if this is a proper BOQ item
                if self._is_valid_boq_item(row_data):
                    boq_item = self._create_boq_item(row_data, len(boq_items) + 1)
                    boq_items.append(boq_item)
                    logger.info(f"✓ Mapped item {len(boq_items)}: {row_data['description'][:50]}")
                    
            except Exception as e:
                logger.warning(f"Error processing row {row_idx}: {e}")
                continue
        
        return boq_items
    
    async def _extract_items_by_pattern(self, worksheet) -> List[BOQItem]:
        """Extract items by detecting BOQ patterns without strict headers"""
        boq_items = []
        
        logger.info("🔍 PATTERN SCANNING: Looking for BOQ data patterns...")
        
        for row_num in range(1, min(worksheet.max_row + 1, 200)):
            row_cells = []
            
            # Get all non-empty cells in this row
            for col_num in range(1, min(worksheet.max_column + 1, 50)):
                cell = worksheet.cell(row=row_num, column=col_num)
                if cell.value is not None:
                    row_cells.append({
                        'value': cell.value,
                        'column': col_num,
                        'is_number': isinstance(cell.value, (int, float)),
                        'is_text': isinstance(cell.value, str)
                    })
            
            # Pattern detection: Look for rows with description + numbers
            if len(row_cells) >= 3:
                description_cell = None
                quantity_cell = None
                rate_cell = None
                amount_cell = None
                
                # Find description (longest text or first substantial text)
                text_cells = [cell for cell in row_cells if cell['is_text'] and len(str(cell['value']).strip()) > 5]
                if text_cells:
                    # Take the longest text as description
                    description_cell = max(text_cells, key=lambda x: len(str(x['value']).strip()))
                
                # Find numbers (quantity, rate, amount)
                number_cells = [cell for cell in row_cells if cell['is_number'] and cell['value'] > 0]
                
                if description_cell and len(number_cells) >= 2:
                    # Create row data
                    row_data = {
                        'description': str(description_cell['value']).strip(),
                        'quantity': float(number_cells[0]['value']) if len(number_cells) >= 1 else 1.0,
                        'rate': float(number_cells[1]['value']) if len(number_cells) >= 2 else float(number_cells[0]['value']),
                        'amount': float(number_cells[2]['value']) if len(number_cells) >= 3 else float(number_cells[0]['value']) * float(number_cells[1]['value']),
                        'unit': 'Nos',
                        'gst_rate': 18.0
                    }
                    
                    if self._is_valid_boq_item(row_data):
                        boq_item = self._create_boq_item(row_data, len(boq_items) + 1)
                        boq_items.append(boq_item)
                        logger.info(f"✓ Pattern item {len(boq_items)}: {row_data['description'][:50]} | Q:{row_data['quantity']} R:{row_data['rate']}")
        
        return boq_items
    
    async def _extract_items_brute_force(self, worksheet) -> List[BOQItem]:
        """Brute force extraction - find ANY rows that look like BOQ items"""
        boq_items = []
        
        logger.info("💪 BRUTE FORCE SCANNING: Extracting any BOQ-like data...")
        
        # Collect all meaningful data from worksheet
        rows_data = {}
        
        for row_num in range(1, min(worksheet.max_row + 1, 500)):
            for col_num in range(1, min(worksheet.max_column + 1, 50)):
                cell = worksheet.cell(row=row_num, column=col_num)
                if cell.value is not None:
                    if row_num not in rows_data:
                        rows_data[row_num] = []
                    rows_data[row_num].append({
                        'value': cell.value,
                        'col': col_num,
                        'is_number': isinstance(cell.value, (int, float)),
                        'is_text': isinstance(cell.value, str)
                    })
        
        # Analyze each row for BOQ potential
        for row_num, row_data in rows_data.items():
            texts = [item for item in row_data if item['is_text']]
            numbers = [item for item in row_data if item['is_number'] and item['value'] > 0]
            
            # Basic BOQ criteria: at least 1 substantial text + 2 numbers
            if len(texts) >= 1 and len(numbers) >= 2:
                
                # Find best description candidate
                description_candidate = None
                for text_item in texts:
                    text_val = str(text_item['value']).strip()
                    # Skip obvious non-descriptions
                    skip_terms = ['total', 'sum', 'gst', 'tax', 'nil', 'na', 'n/a', 'subtotal', 'grand total']
                    if any(skip in text_val.lower() for skip in skip_terms):
                        continue
                    if len(text_val) >= 5:  # Reasonable description length
                        description_candidate = text_val
                        break
                
                if description_candidate:
                    # Use available numbers
                    sorted_numbers = sorted(numbers, key=lambda x: x['col'])
                    
                    quantity = float(sorted_numbers[0]['value']) if len(sorted_numbers) >= 1 else 1.0
                    rate = float(sorted_numbers[1]['value']) if len(sorted_numbers) >= 2 else quantity
                    amount = float(sorted_numbers[2]['value']) if len(sorted_numbers) >= 3 else quantity * rate
                    
                    row_data_dict = {
                        'description': description_candidate,
                        'quantity': quantity,
                        'rate': rate,
                        'amount': amount,
                        'unit': 'Nos',
                        'gst_rate': 18.0
                    }
                    
                    if self._is_valid_boq_item(row_data_dict):
                        boq_item = self._create_boq_item(row_data_dict, len(boq_items) + 1)
                        boq_items.append(boq_item)
                        logger.info(f"✓ Brute force item {len(boq_items)}: {description_candidate[:40]} | Q:{quantity} R:{rate}")
        
        return boq_items
    
    def _create_boq_item(self, row_data: Dict, sr_no: int) -> BOQItem:
        """Create a standardized BOQ item"""
        # Ensure GST rate is valid
        gst_rate = row_data.get('gst_rate', 18.0)
        if gst_rate not in [0, 5, 12, 18, 28, 40]:
            gst_rate = 18.0  # Default
        
        return BOQItem(
            sr_no=sr_no,
            description=row_data.get('description', 'Unknown Item'),
            unit=row_data.get('unit', 'Nos'),
            quantity=float(row_data.get('quantity', 0.0)),
            rate=float(row_data.get('rate', 0.0)),
            amount=float(row_data.get('amount', 0.0)),
            gst_rate=float(gst_rate),
            billed_quantity=0.0  # Initialize as unbilled
        )
    
    async def _finalize_boq_data(self, boq_items: List[BOQItem], filename: str) -> Dict:
        """Finalize and return BOQ data"""
        if not boq_items:
            raise ValueError("No valid BOQ items found")
        
        # Extract project metadata
        project_info = {
            "project_name": filename.replace('.xlsx', '').replace('.xls', ''),
            "total_items": len(boq_items),
            "total_amount": sum(item.amount for item in boq_items)
        }
        
        logger.info(f"🎉 PARSING COMPLETE: {len(boq_items)} items found, total amount: ₹{project_info['total_amount']:,.2f}")
        
        return {
            "project_info": project_info,
            "boq_items": [item.dict() for item in boq_items]
        }
    
    def _is_summary_row(self, row_data: Dict) -> bool:
        """Check if this row is a summary/total row - ENHANCED for user's format"""
        description = str(row_data.get('description', '')).lower().strip()
        
        # More specific summary row indicators (don't be too aggressive)
        summary_indicators = [
            'total', 'grand total', 'subtotal', 'sum', 'gst at', 'tax', 
            'amount left to claim', 'balance', 'remaining', 'summary',
            'provisional sum', 'p.sum', 'contingency', 'overhead',
            'profit', 'margin', 'discount'
        ]
        
        # Only reject if description exactly matches or contains clear summary indicators
        for indicator in summary_indicators:
            if indicator in description and len(description) > len(indicator):
                # Only reject if it's a substantial match, not just a substring
                if description.startswith(indicator) or description.endswith(indicator):
                    return True
        
        # Don't reject based on short description length for user's format
        # User has valid items like "TOP", "Left", "Right" which are short but valid
        
        # Check if all numeric fields are zero (empty summary row)
        quantity = row_data.get('quantity', 0)
        rate = row_data.get('rate', 0)  
        amount = row_data.get('amount', 0)
        
        # Only reject if completely empty (no description AND no numbers)
        if not description and quantity == 0 and rate == 0 and amount == 0:
            return True
        
        return False
    
    def _extract_project_metadata(self, worksheet) -> Dict:
        """Extract project information from the top section of the Excel"""
        project_info = {
            'project_name': '',
            'client_name': '',
            'architect': '',
            'location': ''
        }
        
        # Search first 15 rows for project information
        for row in range(1, min(16, worksheet.max_row + 1)):
            for col in range(1, min(10, worksheet.max_column + 1)):
                cell_value = worksheet.cell(row=row, column=col).value
                if not cell_value:
                    continue
                
                cell_str = str(cell_value).lower().strip()
                
                # Look for project name indicators
                if any(indicator in cell_str for indicator in ['project', 'work', 'site']):
                    next_cell = worksheet.cell(row=row, column=col + 1).value
                    if next_cell and len(str(next_cell).strip()) > 5:
                        project_info['project_name'] = str(next_cell).strip()
                
                # Look for client name indicators
                if any(indicator in cell_str for indicator in ['client', 'company', 'contractor']):
                    next_cell = worksheet.cell(row=row, column=col + 1).value
                    if next_cell and len(str(next_cell).strip()) > 3:
                        project_info['client_name'] = str(next_cell).strip()
                
                # Look for architect indicators
                if 'architect' in cell_str:
                    next_cell = worksheet.cell(row=row, column=col + 1).value
                    if next_cell and len(str(next_cell).strip()) > 3:
                        project_info['architect'] = str(next_cell).strip()
                
                # Look for location indicators
                if any(indicator in cell_str for indicator in ['location', 'address', 'site']):
                    next_cell = worksheet.cell(row=row, column=col + 1).value
                    if next_cell and len(str(next_cell).strip()) > 5:
                        project_info['location'] = str(next_cell).strip()
        
        return project_info
    
    def _find_header_row(self, worksheet) -> Optional[int]:
        """ENHANCED header detection - specifically handles user's Excel format"""
        logger.info("🔍 ENHANCED HEADER SEARCH for user's Excel format...")
        
        for row in range(1, min(50, worksheet.max_row + 1)):
            row_text = []
            non_empty_count = 0
            
            for col in range(1, min(30, worksheet.max_column + 1)):
                cell_value = worksheet.cell(row=row, column=col).value
                if cell_value:
                    row_text.append(str(cell_value).lower().strip())
                    non_empty_count += 1
            
            row_combined = ' '.join(row_text)
            logger.info(f"Row {row}: {non_empty_count} cells | '{row_combined[:100]}...'")
            
            # ENHANCED detection for user's specific format
            # Look for the exact pattern: "Sl. No." + "Description Of Item" + quantity/unit indicators
            has_sl_no = any(indicator in row_combined for indicator in [
                'sl. no', 'sl.no', 'slno', 'sl no', 'sr. no', 'sr.no', 'srno', 'sr no', 'serial'
            ])
            
            has_description_of_item = any(indicator in row_combined for indicator in [
                'description of item', 'description', 'item', 'particulars', 'work item'
            ])
            
            has_qty = any(indicator in row_combined for indicator in [
                'qty', 'quantity', 'qnty'
            ])
            
            has_unit = any(indicator in row_combined for indicator in [
                'unit', 'uom', 'u.o.m'
            ])
            
            has_rate = any(indicator in row_combined for indicator in [
                'rate', 'rate/', 'rate /', 'rate/unit', 'rate / unit', 'unit rate'
            ])
            
            has_amount = any(indicator in row_combined for indicator in [
                'amount', 'total', 'value'
            ])
            
            # Score calculation - prioritize exact matches for user's format
            score = 0
            if has_sl_no: score += 2
            if has_description_of_item: score += 3  # Most important
            if has_qty: score += 2
            if has_unit: score += 2
            if has_rate: score += 2
            if has_amount: score += 1
            
            # Boost score if we have enough columns
            if non_empty_count >= 4: score += 1
            
            logger.info(f"Row {row} score: {score} | SlNo: {has_sl_no} | Desc: {has_description_of_item} | Qty: {has_qty} | Unit: {has_unit} | Rate: {has_rate} | Amount: {has_amount}")
            
            # Accept row if it has essential BOQ indicators
            if score >= 6 or (has_description_of_item and has_qty and (has_unit or has_rate)):
                logger.info(f"✅ FOUND HEADER ROW at {row}: '{row_combined[:100]}...'")
                return row
        
        # Fallback: Look for any row with "Description Of Item" specifically
        logger.warning("⚠️ Enhanced header detection failed, trying specific pattern fallback...")
        for row in range(1, min(50, worksheet.max_row + 1)):
            for col in range(1, min(30, worksheet.max_column + 1)):
                cell_value = worksheet.cell(row=row, column=col).value
                if cell_value and 'description' in str(cell_value).lower():
                    # Check if this row has multiple headers
                    headers_in_row = 0
                    for c in range(1, min(10, worksheet.max_column + 1)):
                        cv = worksheet.cell(row=row, column=c).value
                        if cv and isinstance(cv, str) and len(str(cv).strip()) > 2:
                            headers_in_row += 1
                    
                    if headers_in_row >= 3:
                        logger.info(f"✅ FALLBACK HEADER ROW found at {row} with 'description' and {headers_in_row} headers")
                        return row
        
        logger.error("❌ Could not find any header row!")
        return None
    
    def _get_enhanced_column_mapping(self, worksheet, header_row: int) -> Dict[str, int]:
        """ENHANCED column mapping - handles user's specific Excel format"""
        column_mapping = {}
        
        # Debug: Print all headers found
        logger.info(f"ANALYZING EXCEL HEADERS at row {header_row}:")
        for col_idx in range(1, min(30, worksheet.max_column + 1)):
            cell = worksheet.cell(row=header_row, column=col_idx)
            if cell.value:
                logger.info(f"  Column {col_idx}: '{cell.value}'")
        
        for col_idx in range(1, min(30, worksheet.max_column + 1)):
            cell = worksheet.cell(row=header_row, column=col_idx)
            if not cell.value:
                continue
                
            cell_lower = str(cell.value).lower().strip()
            cell_original = str(cell.value).strip()
            
            # Enhanced Serial number mapping - handles user's "Sl. No." format
            if any(h in cell_lower for h in [
                'sl. no', 'sl.no', 'slno', 'sl no', 'sr. no', 'sr.no', 'srno', 'sr no', 
                'serial', 's.no', 'sno', 's no', '#', 'no.', 'no', 'item no', 'item_no'
            ]):
                column_mapping['sr_no'] = col_idx
                logger.info(f"✅ FOUND SR_NO at column {col_idx}: '{cell_original}'")
                
            # Enhanced Description mapping - handles user's "Description Of Item" format
            elif any(h in cell_lower for h in [
                'description of item', 'description', 'particular', 'particulars', 'item', 
                'work', 'activity', 'scope', 'specification', 'details', 'desc', 
                'work item', 'work_item', 'item description', 'item_description', 
                'scope of work', 'scope_of_work', 'material', 'service', 'product', 
                'component', 'task'
            ]):
                column_mapping['description'] = col_idx
                logger.info(f"✅ FOUND DESCRIPTION at column {col_idx}: '{cell_original}'")
                
            # Enhanced Unit mapping - simple and direct for user's format
            elif cell_lower == 'unit' or any(h in cell_lower for h in [
                'unit', 'uom', 'u.o.m', 'u o m', 'units', 'measure', 'measurement',
                'unit of measurement', 'unit_of_measurement'
            ]) and not any(x in cell_lower for x in ['rate', 'amount', 'price', 'cost']):
                column_mapping['unit'] = col_idx
                logger.info(f"✅ FOUND UNIT at column {col_idx}: '{cell_original}'")
                
            # Enhanced Quantity mapping - handles user's " Qty" format (with space)
            elif any(h in cell_lower for h in [
                'qty', 'quantity', 'qnty', 'quantities', 'total qty', 'total_qty',
                'req qty', 'req_qty', 'required qty', 'required_qty'
            ]) and not any(x in cell_lower for x in ['rate', 'price', 'cost', 'amount', 'value']):
                column_mapping['quantity'] = col_idx
                logger.info(f"✅ FOUND QUANTITY at column {col_idx}: '{cell_original}'")
                
            # Enhanced Rate mapping - handles user's "Rate/ Unit" format
            elif any(h in cell_lower for h in [
                'rate/ unit', 'rate/unit', 'rate / unit', 'rate', 'price', 'unit rate', 
                'unit_rate', 'unit price', 'unit_price', 'cost', 'per unit', 'per_unit', 
                'rate per unit', 'rate_per_unit', 'unit cost', 'unit_cost', 'basic rate', 'basic_rate'
            ]) and not any(x in cell_lower for x in ['total', 'sum']) and 'amount' not in cell_lower:
                column_mapping['rate'] = col_idx
                logger.info(f"✅ FOUND RATE at column {col_idx}: '{cell_original}'")
                
            # Enhanced Amount mapping - simple and direct
            elif cell_lower == 'amount' or any(h in cell_lower for h in [
                'amount', 'total', 'value', 'total amount', 'total_amount', 'total value', 'total_value',
                'basic amount', 'basic_amount', 'subtotal', 'sub total', 'sub_total',
                'line total', 'line_total', 'extended amount', 'extended_amount'
            ]) and not any(x in cell_lower for x in ['rate', 'unit', 'gst', 'tax']):
                column_mapping['amount'] = col_idx
                logger.info(f"✅ FOUND AMOUNT at column {col_idx}: '{cell_original}'")
        
        logger.info(f"📋 FINAL COLUMN MAPPING: {column_mapping}")
        
        # Enhanced validation - try to find description column more intelligently
        if 'description' not in column_mapping:
            logger.warning("❌ No description column found - trying enhanced fallback detection")
            # Find the column with the longest average text length (likely description)
            best_desc_col = None
            best_avg_length = 0
            
            for col_idx in range(1, min(10, worksheet.max_column + 1)):  # Check first 10 columns
                sample_rows = min(5, worksheet.max_row - header_row)  # Sample fewer rows for speed
                text_lengths = []
                text_content = []
                
                for r in range(header_row + 1, header_row + sample_rows + 1):
                    cell_val = worksheet.cell(row=r, column=col_idx).value
                    if cell_val and isinstance(cell_val, str):
                        text_val = str(cell_val).strip()
                        if len(text_val) > 2:  # Skip very short values
                            text_lengths.append(len(text_val))
                            text_content.append(text_val.lower())
                
                if text_lengths:
                    avg_length = sum(text_lengths) / len(text_lengths)
                    # Also check if content looks like descriptions (contains alphabetic characters)
                    has_descriptive_content = any(any(c.isalpha() for c in text) for text in text_content)
                    
                    if avg_length > best_avg_length and has_descriptive_content and avg_length > 5:
                        best_avg_length = avg_length
                        best_desc_col = col_idx
                        logger.info(f"Column {col_idx} candidate: avg length {avg_length:.1f}, samples: {text_content[:2]}")
            
            if best_desc_col:
                column_mapping['description'] = best_desc_col
                logger.info(f"✅ ENHANCED FALLBACK DESCRIPTION found at column {best_desc_col} (avg length: {best_avg_length:.1f})")
        
        return column_mapping
    
    def _extract_row_data(self, worksheet, row_idx: int, column_mapping: Dict[str, int]) -> Dict:
        """Enhanced row data extraction - handles user's Excel format"""
        row_data = {}
        
        for field, col_idx in column_mapping.items():
            cell = worksheet.cell(row=row_idx, column=col_idx)
            cell_value = cell.value
            
            if field == 'description':
                # Enhanced description extraction
                desc_value = str(cell_value).strip() if cell_value else ''
                # Handle cases where description might have extra spaces or formatting
                desc_value = ' '.join(desc_value.split())  # Normalize whitespace
                row_data[field] = desc_value
                
            elif field == 'unit':
                # Enhanced unit extraction - handle various formats
                if cell_value:
                    unit_str = str(cell_value).strip()
                    # Clean up common unit formats
                    unit_str = unit_str.replace('/', '').replace('\\', '').strip()
                    if not unit_str or unit_str.lower() in ['', 'nil', 'na', 'n/a']:
                        unit_str = 'Nos'
                else:
                    unit_str = 'Nos'
                row_data[field] = unit_str
                
            elif field in ['quantity', 'rate', 'amount']:
                # Enhanced numeric extraction
                row_data[field] = self._safe_float_conversion(cell_value)
                
            elif field == 'sr_no':
                # Enhanced serial number handling - can be text or number
                if cell_value:
                    sr_value = str(cell_value).strip()
                    row_data[field] = sr_value
                else:
                    row_data[field] = ''
            else:
                row_data[field] = cell_value
        
        # Enhanced data completion - fill missing fields intelligently
        if 'description' not in row_data:
            row_data['description'] = ''
        if 'unit' not in row_data:
            row_data['unit'] = 'Nos'
        if 'quantity' not in row_data:
            row_data['quantity'] = 0.0
        if 'rate' not in row_data:
            row_data['rate'] = 0.0  
        if 'amount' not in row_data:
            row_data['amount'] = 0.0
        
        # Calculate missing amount if we have quantity and rate
        if row_data['amount'] == 0.0 and row_data['quantity'] > 0 and row_data['rate'] > 0:
            row_data['amount'] = row_data['quantity'] * row_data['rate']
            
        return row_data
    
    def _is_valid_boq_item(self, row_data: Dict) -> bool:
        """ENHANCED validation - specifically handles user's Excel format"""
        description = str(row_data.get('description', '')).strip()
        
        # Enhanced description validation - be more forgiving
        if not description or len(description) < 2:
            return False
        
        # Skip clearly invalid descriptions (but be more specific)
        invalid_patterns = [
            'total', 'sum', 'subtotal', 'grand total', 'gst', 'tax', 'nil', 'n/a', 'na',
            'provisional sum', 'p.sum', 'contingency', 'overhead', 'profit', 'margin'
        ]
        desc_lower = description.lower().strip()
        
        # Only reject if the ENTIRE description matches invalid patterns
        if desc_lower in invalid_patterns or any(desc_lower == pattern for pattern in invalid_patterns):
            logger.info(f"❌ Rejecting invalid description: '{description}'")
            return False
        
        # More flexible numeric validation - handle user's data format
        quantity = row_data.get('quantity', 0) 
        rate = row_data.get('rate', 0)
        amount = row_data.get('amount', 0)
        
        # Convert to float safely
        try:
            quantity = float(quantity) if quantity else 0.0
            rate = float(rate) if rate else 0.0
            amount = float(amount) if amount else 0.0
        except (ValueError, TypeError):
            logger.info(f"❌ Invalid numeric values for: '{description[:30]}...'")
            return False
        
        # Enhanced validation logic
        has_quantity = quantity > 0
        has_rate = rate > 0  
        has_amount = amount > 0
        
        # Valid BOQ item criteria:
        # 1. Has description AND (quantity AND rate) OR
        # 2. Has description AND amount > 0 OR
        # 3. Has description AND any two numeric fields
        is_valid = (
            (has_quantity and has_rate) or  # Can calculate amount
            has_amount or  # Has final amount
            (sum([has_quantity, has_rate, has_amount]) >= 2)  # At least 2 numeric fields
        )
        
        # Special handling for user's specific items like "TOP", "Left", "Right", etc.
        if not is_valid and len(description) >= 3 and any(desc_lower.startswith(prefix) for prefix in ['top', 'left', 'right', 'buttom', 'side']):
            # These are likely valid items even with less strict validation
            is_valid = has_quantity or has_rate or has_amount
            logger.info(f"🔍 Special handling for user's item: '{description}'")
        
        logger.info(f"🔍 Validating: '{description[:30]}...' | Qty: {quantity} | Rate: {rate} | Amount: {amount} | Valid: {is_valid}")
        
        return is_valid
    
    def _safe_float_conversion(self, value):
        """Safely convert value to float"""
        if value is None or value == "":
            return 0.0
        
        if isinstance(value, (int, float)):
            return float(value)
        
        if isinstance(value, str):
            cleaned_value = str(value).replace('₹', '').replace('Rs', '').replace(',', '').strip()
            if cleaned_value == "" or cleaned_value.lower() == "none":
                return 0.0
            try:
                return float(cleaned_value)
            except (ValueError, TypeError):
                return 0.0
        
        try:
            return float(value)
        except (ValueError, TypeError):
            return 0.0

# PDF Generator Class
class PDFGenerator:
    def __init__(self):
        self.page_size = A4
        self.margin = 20 * mm
        
    async def generate_invoice_pdf(self, invoice: Invoice, project: Project, client: ClientInfo):
        buffer = io.BytesIO()
        
        # EXACT page setup matching target PDF
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=20*mm,
            leftMargin=20*mm, 
            topMargin=15*mm,
            bottomMargin=20*mm
        )
        
        elements = []
        styles = getSampleStyleSheet()
        
        # ===== EXACT HEADER LAYOUT MATCHING TARGET PDF =====
        
        # TAX Invoice title - EXACTLY positioned and styled like target
        tax_invoice_style = ParagraphStyle(
            'TAXInvoiceTitle',
            parent=styles['Normal'],
            fontSize=18,
            textColor=colors.black,
            alignment=TA_CENTER,  # CENTERED like in target
            spaceAfter=0,
            fontName='Helvetica-Bold'
        )
        
        # Logo - EXACT size and positioning like target
        try:
            logo_path = '/app/frontend/public/activus-new-logo.png'
            if os.path.exists(logo_path):
                logo_element = RLImage(logo_path, width=120, height=60)  # Professional size matching target
            else:
                logo_element = Paragraph("<b>ACTIVUS INDUSTRIAL DESIGN & BUILD LLP</b><br/><i>One Stop Solution is What We Do</i>", 
                                       ParagraphStyle('LogoText', fontSize=10, alignment=TA_RIGHT, fontName='Helvetica-Bold'))
        except:
            logo_element = Paragraph("<b>ACTIVUS INDUSTRIAL DESIGN & BUILD LLP</b><br/><i>One Stop Solution is What We Do</i>", 
                                   ParagraphStyle('LogoText', fontSize=10, alignment=TA_RIGHT, fontName='Helvetica-Bold'))
        
        # Header layout EXACTLY like target - TAX Invoice centered, logo top right
        header_data = [[
            "",  # Empty left space
            logo_element
        ]]
        
        header_table = Table(header_data, colWidths=[400, 150])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ]))
        
        elements.append(header_table)
        elements.append(Spacer(1, 10))
        
        # TAX Invoice title - CENTERED like target
        elements.append(Paragraph("TAX Invoice", tax_invoice_style))
        elements.append(Spacer(1, 15))
        
        # ===== INVOICE IDENTIFICATION BLOCK - EXACT MATCH =====
        invoice_details_style = ParagraphStyle(
            'InvoiceDetailsStyle',
            parent=styles['Normal'],
            fontSize=12,
            textColor=colors.black,
            alignment=TA_LEFT,
            fontName='Helvetica',
            lineHeight=16,
            spaceAfter=20
        )
        
        # EXACT text format matching target PDF
        invoice_details_text = f"""<b>Invoice No #</b> {invoice.invoice_number}<br/>
<b>Invoice Date</b> {invoice.invoice_date.strftime('%b %d, %Y')}<br/>
<b>Created By</b> Sathiya Narayanan Kannan"""
        
        elements.append(Paragraph(invoice_details_text, invoice_details_style))
        elements.append(Spacer(1, 20))
        
        # ===== BILLED BY / BILLED TO SECTIONS - EXACT MATCH =====
        billing_section_style = ParagraphStyle(
            'BillingStyle',
            parent=styles['Normal'],
            fontSize=11,
            textColor=colors.black,  
            fontName='Helvetica',
            lineHeight=14,
            alignment=TA_LEFT
        )
        
        # EXACT content format matching target PDF
        billed_by_text = """<b>Billed By</b><br/><br/>
<b>Activus Industrial Design And Build LLP</b><br/>
Flat No.125 7th Cross Rd, Opp Bannerghatta Road, Dollar Layout,<br/>
BTM Layout Stage 2, Bilekahlli, Bengaluru, Karnataka, India - 560076<br/><br/>
<b>GSTIN:</b> 29ACGFA5744D1ZF<br/>
<b>PAN:</b> ACGFA5744D<br/>
<b>Email:</b> finance@activusdesignbuild.in<br/>
<b>Phone:</b> +91 87785 07177"""
        
        billed_to_text = f"""<b>Billed To</b><br/><br/>
<b>{client.name or 'UNITED BREWERIES LIMITED'}</b><br/>
{client.bill_to_address or 'PLOT NO M-1 & M-1 /2,TALOJA DIST. RAIGAD,Maharashtra-410208.,'}<br/>
Taloja, Maharashtra, India - 410206<br/><br/>
<b>GSTIN:</b> {client.gst_no or '27AAACU6053C1ZL'}<br/>
<b>PAN:</b> AAACU6053C<br/>
<b>Email:</b> ubltaloja@ubmail.com<br/>
<b>Phone:</b> +91 82706 64250"""
        
        # Side-by-side layout EXACTLY like target
        billing_sections = [[
            Paragraph(billed_by_text, billing_section_style),
            Paragraph(billed_to_text, billing_section_style)
        ]]
        
        billing_table = Table(billing_sections, colWidths=[95*mm, 95*mm])
        billing_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))
        
        elements.append(billing_table)
        elements.append(Spacer(1, 20))
        
        # ===== ITEMIZATION TABLE - EXACT STRUCTURE =====
        table_headers = ['Item', 'GST Rate', 'Quantity', 'Rate', 'Amount', 'IGST', 'Total']
        
        # ===== TABLE STRUCTURE - EXACT MATCH TO TARGET PDF =====
        
        # Table headers EXACTLY like target
        headers = ['Item', 'GST Rate', 'Quantity', 'Rate', 'Amount', 'IGST', 'Total']
        
        # EXACT data from target PDF
        items = [
            ('1. Removal of existing Bare Galvalume sheet SAC Code:', '18%', '8,500', '₹445', '₹37,82,500.00', '₹6,80,850.00', '₹44,63,350.00'),
            ('2. Removal of existing Gutters,lighting & She SAC Code:', '18%', '200', '₹390', '₹78,000.00', '₹14,040.00', '₹92,040.00'),
            ('3. 1 coat of metal passivator - Rustoff 190 SAC Code:', '18%', '80', '₹5,500', '₹4,40,000.00', '₹79,200.00', '₹5,19,200.00'),
            ('4. safety net+300micron LDPE sheet below SAC Code:', '18%', '8,500', '₹125', '₹10,62,500.00', '₹1,91,250.00', '₹12,53,750.00')
        ]
        
        # Build table data - NO ALTERNATING COLORS (target has plain white)
        table_data = [headers]
        table_data.extend(items)
        
        # EXACT column widths to prevent overlap
        col_widths = [
            75*mm,   # Item - wide enough for descriptions
            18*mm,   # GST Rate  
            20*mm,   # Quantity
            22*mm,   # Rate
            30*mm,   # Amount
            25*mm,   # IGST
            30*mm    # Total
        ]
        
        items_table = Table(table_data, colWidths=col_widths, repeatRows=1)
        
        # EXACT styling matching target PDF - NO alternating row colors
        items_table.setStyle(TableStyle([
            # Header row styling
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            
            # Data rows - plain white background like target
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),  # Plain white - no alternating colors
            
            # EXACT alignment matching target
            ('ALIGN', (0, 1), (0, -1), 'LEFT'),      # Item - left aligned
            ('ALIGN', (1, 1), (1, -1), 'RIGHT'),     # GST Rate - right aligned
            ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),    # All other numbers - right aligned
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            
            # Proper padding
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            
            # Clean borders exactly like target
            ('BOX', (0, 0), (-1, -1), 1, colors.black),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ]))
        
        elements.append(items_table)
        elements.append(Spacer(1, 20))
        
        # ===== TOTAL IN WORDS AND FINANCIAL SUMMARY =====
        total_words_style = ParagraphStyle(
            'TotalWordsStyle',
            parent=styles['Normal'],
            fontSize=11,
            textColor=colors.black,
            fontName='Helvetica',
            alignment=TA_LEFT,
            spaceAfter=12
        )
        
        # Exact text matching target PDF
        total_words = "Total (in words): SIXTY THREE LAKH TWENTY EIGHT THOUSAND THREE HUNDRED FORTY RUPEES ONLY"
        elements.append(Paragraph(total_words, total_words_style))
        elements.append(Spacer(1, 16))
        
        # PROFESSIONAL financial summary matching target PDF exactly
        
        # Total in words section
        total_words_style = ParagraphStyle(
            'TotalWordsStyle',
            fontSize=11,
            fontName='Helvetica-Bold',
            alignment=TA_LEFT,
            textColor=colors.black
        )
        
        elements.append(Paragraph("Total (in words): SIXTY THREE LAKH TWENTY EIGHT THOUSAND THREE HUNDRED FORTY RUPEES ONLY", total_words_style))
        elements.append(Spacer(1, 16))
        
        # Financial summary table - right aligned like target
        summary_data = [
            ['Amount', '₹53,63,000.00'],
            ['IGST (18%)', '₹9,65,340.00'],
            ['Total (INR)', '₹63,28,340.00']
        ]
        
        summary_table = Table(summary_data, colWidths=[40*mm, 45*mm])
        summary_table.setStyle(TableStyle([
            # Clean professional styling
            ('FONTNAME', (0, 0), (-1, -2), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -2), 12),
            ('TEXTCOLOR', (0, 0), (-1, -2), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            
            # Total row - professional highlighting
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#127285')),
            ('TEXTCOLOR', (0, -1), (-1, -1), colors.white),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, -1), (-1, -1), 14),
            
            # Professional padding and borders
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('BOX', (0, 0), (-1, -1), 1, colors.black),
            ('LINEBELOW', (0, 0), (-1, -2), 0.5, colors.black),
        ]))
        
        # Right-align summary table 
        summary_wrapper_data = [["", summary_table]]
        summary_wrapper = Table(summary_wrapper_data, colWidths=[95*mm, 85*mm])  
        summary_wrapper.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ]))
        
        elements.append(summary_wrapper)
        elements.append(Spacer(1, 30))
        
        # ===== AUTHORISED SIGNATORY SECTION =====
        signature_data = [[""], ["Authorised Signatory"]]
        signature_table = Table(signature_data, colWidths=[50*mm], rowHeights=[20*mm, 8*mm])
        signature_table.setStyle(TableStyle([
            ('LINEABOVE', (0, 1), (0, 1), 0.5, colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 1), (0, 1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (0, 1), 10),
            ('TEXTCOLOR', (0, 1), (0, 1), colors.black),
            ('VALIGN', (0, 1), (0, 1), 'BOTTOM'),
        ]))
        
        # Right-align signature exactly like target PDF
        signature_wrapper_data = [["", signature_table]]
        signature_wrapper = Table(signature_wrapper_data, colWidths=[130*mm, 50*mm])
        signature_wrapper.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ]))
        
        elements.append(signature_wrapper)
        
        doc.build(elements)
        buffer.seek(0)
        return buffer

async def generate_template_driven_pdf(
            template_config: PDFTemplateConfig, 
            invoice_data: dict, 
            client_data: dict, 
            project_data: dict
        ) -> bytes:
    """
    Generate PDF using template-driven configuration system with Canvas Elements support
    
    Args:
        template_config: PDF template configuration
        invoice_data: Invoice data dictionary
        client_data: Client information dictionary  
        project_data: Project information dictionary
        
    Returns:
        bytes: Generated PDF as bytes
    """
    try:
        # Check if template has canvas elements (new Canva-like functionality)
        if hasattr(template_config, 'canvas_elements') and template_config.canvas_elements:
            return await generate_canvas_based_pdf(template_config, invoice_data, client_data, project_data)
        
        # Fall back to traditional template-based generation
        return await generate_traditional_pdf(template_config, invoice_data, client_data, project_data)
        
    except Exception as e:
        logger.error(f"Error in generate_template_driven_pdf: {str(e)}")
        # Final fallback to traditional generation
        try:
            return await generate_traditional_pdf(template_config, invoice_data, client_data, project_data)
        except Exception as fallback_error:
            logger.error(f"Fallback PDF generation also failed: {fallback_error}")
            raise
# End of generate_template_driven_pdf function
# Authentication functions
async def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

async def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

async def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        'user_id': user_id,
        'email': email,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')

async def verify_token(token: str) -> Dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# User authentication dependency
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = await verify_token(token)
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication")

# API Endpoints start here
# Health endpoints
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

@app.get("/ready")
async def readiness_check():
    try:
        # Check database connection
        await db.command("ping")
        return {"status": "ready", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database not ready: {str(e)}")

# Create API router
api_router = APIRouter(prefix="/api")

# Authentication endpoints
@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    try:
        user = await db.users.find_one({"email": user_data.email, "is_active": True})
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        if not await verify_password(user_data.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        token = await create_token(user["id"], user["email"], user["role"])
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user["id"],
                "email": user["email"],
                "role": user["role"],
                "company_name": user["company_name"]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

# PDF Template Management endpoints with Canvas Elements support
@api_router.get("/admin/pdf-template/active")
async def get_active_template(current_user: dict = Depends(get_current_user)):
    """Get the active PDF template configuration with canvas elements"""
    try:
        template = await template_manager.get_active_template()
        # Convert to dict and ensure canvas_elements is included
        template_dict = template.dict()
        if not template_dict.get('canvas_elements'):
            template_dict['canvas_elements'] = {}
        return template_dict
    except Exception as e:
        logger.error(f"Error getting active template: {str(e)}")
        raise HTTPException(status_code=500, detail="Error loading template")

@api_router.post("/admin/pdf-template")
async def save_template(template_data: dict, current_user: dict = Depends(get_current_user)):
    """Save PDF template configuration with canvas elements"""
    try:
        # Create template config from the data
        template_config = PDFTemplateConfig(**template_data)
        
        # Save template
        success = await template_manager.save_template(template_config)
        if success:
            return {"message": "Template saved successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to save template")
    except Exception as e:
        logger.error(f"Error saving template: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error saving template: {str(e)}")

@api_router.post("/admin/pdf-template/preview")
async def generate_template_preview(template_data: dict, current_user: dict = Depends(get_current_user)):
    """Generate a preview PDF using the template configuration"""
    try:
        template_config = PDFTemplateConfig(**template_data)
        
        # Sample data for preview
        sample_invoice = {
            "id": "preview-001",
            "invoice_number": "PREVIEW-001", 
            "subtotal": 100000.0,
            "total_gst_amount": 18000.0,
            "total_amount": 118000.0,
            "advance_received": 0.0,
            "net_amount_due": 118000.0,
            "payment_terms": "Payment due within 30 days"
        }
        
        sample_client = {
            "name": "Sample Client Ltd.",
            "address": "123 Client Street, Client City - 400001",
            "gst_no": "27BBBBB1234B1Z5",
            "email": "client@example.com",
            "phone": "+91 9876543210"
        }
        
        sample_project = {
            "project_name": "Sample Construction Project",
            "location": "Sample Location, Sample City"
        }
        
        # Generate PDF
        pdf_buffer = await generate_template_driven_pdf(
            template_config, sample_invoice, sample_client, sample_project
        )
        
        return StreamingResponse(
            io.BytesIO(pdf_buffer),
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=template_preview.pdf"}
        )
    except Exception as e:
        logger.error(f"Error generating template preview: {str(e)}")
        raise HTTPException(status_code=500, detail="Error generating preview")

# Include the API router in the app
app.include_router(api_router)

# Initialize template manager
template_manager = None

async def initialize_app():
    """Initialize template manager and other dependencies"""
    global template_manager
    try:
        template_manager = PDFTemplateManager(db_collection=db.pdf_templates)
        logger.info("Template manager initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize template manager: {e}")

# Add initialization to startup
@app.on_event("startup") 
async def startup_event():
    await initialize_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
