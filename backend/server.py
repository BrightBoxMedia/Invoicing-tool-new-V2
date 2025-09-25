#!/usr/bin/env python3
"""
Activus Invoice Management System - Production Backend
Professional invoice and project management for construction industry
"""

import os
import uuid
import bcrypt
import jwt
import asyncio
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional, Union
from io import BytesIO
import base64

# FastAPI and Pydantic imports
from fastapi import FastAPI, HTTPException, Depends, File, UploadFile, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response, FileResponse, StreamingResponse
from pydantic import BaseModel, Field, validator
import uvicorn
import json
import websockets

# Database
import motor.motor_asyncio
from motor.motor_asyncio import AsyncIOMotorDatabase

# Excel processing
import openpyxl
from openpyxl import load_workbook

# PDF generation
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.units import mm

# Logging
import logging

# Environment setup
SECRET_KEY = os.getenv('JWT_SECRET', 'activus-invoice-secret-key-2025')
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(
    title="Activus Invoice Management API",
    description="Professional Invoice Management System for Construction Projects",
    version="2.0.0"
)

# CORS configuration for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Database connection
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
db: AsyncIOMotorDatabase = client.activus_invoice_db

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
    ra_percentage: float = 0.0   # RA Bill with Taxes
    erection_percentage: float = 0.0  # Erection Work
    pbg_percentage: float = 0.0  # Performance Bank Guarantee
    
    total_project_value: float
    boq_items: List[BOQItem] = []
    status: str = ProjectStatus.ACTIVE
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @validator('abg_percentage', 'ra_percentage', 'erection_percentage', 'pbg_percentage')
    def validate_percentage(cls, v):
        if v < 0 or v > 100:
            raise ValueError('Percentage must be between 0 and 100')
        return v

    def validate_total_percentage(self):
        total = self.abg_percentage + self.ra_percentage + self.erection_percentage + self.pbg_percentage
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
        """Enhanced BOQ parsing that ignores totals, GST, and grand totals"""
        
        # Find header row
        header_row = self._find_header_row(worksheet)
        if not header_row:
            raise ValueError("Could not find BOQ headers in the Excel file")
        
        # Get column mapping
        column_mapping = self._get_enhanced_column_mapping(worksheet, header_row)
        logger.info(f"Column mapping: {column_mapping}")
        
        # Extract project metadata from top section
        project_info = self._extract_project_metadata(worksheet)
        
        # Parse BOQ items (ignore summary rows)
        boq_items = []
        row_idx = header_row + 1
        
        while row_idx <= worksheet.max_row:
            try:
                row_data = self._extract_row_data(worksheet, row_idx, column_mapping)
                
                # Skip if this is a summary/total row
                if self._is_summary_row(row_data):
                    logger.info(f"Skipping summary row {row_idx}: {row_data.get('description', 'Unknown')}")
                    row_idx += 1
                    continue
                
                # Validate if this is a proper BOQ item
                if self._is_valid_boq_item(row_data):
                    # Ensure GST rate is valid (add 40% option)
                    if 'gst_rate' not in row_data or row_data['gst_rate'] == 0:
                        row_data['gst_rate'] = 18.0  # Default
                    
                    boq_item = BOQItem(
                        sr_no=len(boq_items) + 1,
                        description=row_data['description'],
                        unit=row_data.get('unit', 'Nos'),
                        quantity=row_data.get('quantity', 0.0),
                        rate=row_data.get('rate', 0.0),
                        amount=row_data.get('amount', 0.0),
                        gst_rate=row_data.get('gst_rate', 18.0),
                        billed_quantity=0.0  # Initialize as unbilled
                    )
                    boq_items.append(boq_item)
                    logger.info(f"Added BOQ item {len(boq_items)}: {boq_item.description[:50]}...")
                
            except Exception as e:
                logger.warning(f"Error parsing row {row_idx}: {str(e)}")
            
            row_idx += 1
        
        if not boq_items:
            raise ValueError("No valid BOQ items found in the Excel file")
        
        # Calculate total project value
        total_value = sum(item.amount for item in boq_items)
        
        return {
            "project_info": project_info,
            "boq_items": [item.dict() for item in boq_items],
            "total_items": len(boq_items),
            "total_project_value": total_value,
            "filename": filename
        }
    
    def _is_summary_row(self, row_data: Dict) -> bool:
        """Check if this row is a summary/total row that should be ignored"""
        description = str(row_data.get('description', '')).lower().strip()
        
        # Common summary row indicators
        summary_indicators = [
            'total', 'grand total', 'subtotal', 'sum', 'gst', 'tax',
            'amount left to claim', 'balance', 'remaining', 'summary',
            'provisional sum', 'p.sum', 'contingency', 'overhead',
            'profit', 'margin', 'discount'
        ]
        
        for indicator in summary_indicators:
            if indicator in description:
                return True
        
        # Check if description is too short (likely a summary)
        if len(description.strip()) < 10:
            return True
        
        # Check if all numeric fields are zero (empty summary row)
        quantity = row_data.get('quantity', 0)
        rate = row_data.get('rate', 0)
        amount = row_data.get('amount', 0)
        
        if quantity == 0 and rate == 0 and amount == 0:
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
        """Find the header row containing BOQ column names"""
        for row in range(1, min(25, worksheet.max_row + 1)):
            row_text = []
            for col in range(1, min(15, worksheet.max_column + 1)):
                cell_value = worksheet.cell(row=row, column=col).value
                if cell_value:
                    row_text.append(str(cell_value).lower())
            
            row_combined = ' '.join(row_text)
            
            # Check if this row contains BOQ headers
            header_indicators = ['description', 'particular', 'item', 'work']
            numeric_indicators = ['quantity', 'qty', 'rate', 'amount']
            
            has_description = any(indicator in row_combined for indicator in header_indicators)
            has_numeric = any(indicator in row_combined for indicator in numeric_indicators)
            
            if has_description and has_numeric:
                logger.info(f"Found header row at {row}: {row_combined}")
                return row
        
        return None
    
    def _get_enhanced_column_mapping(self, worksheet, header_row: int) -> Dict[str, int]:
        """Enhanced column mapping with better pattern recognition"""
        column_mapping = {}
        
        for col_idx in range(1, min(20, worksheet.max_column + 1)):
            cell = worksheet.cell(row=header_row, column=col_idx)
            if not cell.value:
                continue
                
            cell_lower = str(cell.value).lower().strip()
            
            # Serial number mapping
            if any(h in cell_lower for h in ['sr', 'serial', 's.no', 'sno', '#']):
                column_mapping['sr_no'] = col_idx
                
            # Description mapping (most important)
            elif any(h in cell_lower for h in ['description', 'particular', 'item', 'work', 'activity']):
                column_mapping['description'] = col_idx
                
            # Unit mapping
            elif any(h in cell_lower for h in ['unit', 'uom', 'u.o.m']) and 'rate' not in cell_lower:
                column_mapping['unit'] = col_idx
                
            # Quantity mapping
            elif any(h in cell_lower for h in ['qty', 'quantity']) and 'rate' not in cell_lower:
                column_mapping['quantity'] = col_idx
                
            # Rate mapping
            elif any(h in cell_lower for h in ['rate', 'price']) and 'amount' not in cell_lower:
                column_mapping['rate'] = col_idx
                
            # Amount mapping
            elif any(h in cell_lower for h in ['amount', 'total', 'value']) and 'rate' not in cell_lower:
                column_mapping['amount'] = col_idx
        
        return column_mapping
    
    def _extract_row_data(self, worksheet, row_idx: int, column_mapping: Dict[str, int]) -> Dict:
        """Extract data from a specific row using column mapping"""
        row_data = {}
        
        for field, col_idx in column_mapping.items():
            cell = worksheet.cell(row=row_idx, column=col_idx)
            cell_value = cell.value
            
            if field == 'description':
                row_data[field] = str(cell_value).strip() if cell_value else ''
            elif field == 'unit':
                unit_str = str(cell_value).strip() if cell_value else 'Nos'
                row_data[field] = unit_str
            elif field in ['quantity', 'rate', 'amount']:
                row_data[field] = self._safe_float_conversion(cell_value)
            else:
                row_data[field] = cell_value
        
        return row_data
    
    def _is_valid_boq_item(self, row_data: Dict) -> bool:
        """Validate if this is a proper BOQ item"""
        description = row_data.get('description', '')
        
        # Must have meaningful description
        if not description or len(description.strip()) < 10:
            return False
        
        # Must have at least one numeric value > 0
        quantity = row_data.get('quantity', 0)
        rate = row_data.get('rate', 0)
        amount = row_data.get('amount', 0)
        
        return any(val > 0 for val in [quantity, rate, amount])
    
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
        
    async def generate_invoice_pdf(self, invoice: Invoice, project: Project, client: ClientInfo) -> BytesIO:
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=self.page_size,
            rightMargin=self.margin,
            leftMargin=self.margin,
            topMargin=self.margin,
            bottomMargin=self.margin
        )
        
        elements = []
        styles = getSampleStyleSheet()
        
        # Company branding
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=20,
            textColor=colors.HexColor('#127285'),
            alignment=TA_CENTER,
            spaceAfter=12,
            fontName='Helvetica-Bold'
        )
        
        # Company Header
        elements.append(Paragraph("ACTIVUS INDUSTRIAL DESIGN & BUILD LLP", title_style))
        elements.append(Paragraph("Professional Industrial Solutions", styles['Normal']))
        elements.append(Spacer(1, 20))
        
        # Invoice type
        invoice_type_display = "TAX INVOICE" if invoice.invoice_type == "tax_invoice" else "PROFORMA INVOICE"
        elements.append(Paragraph(invoice_type_display, styles['Heading2']))
        elements.append(Spacer(1, 20))
        
        # Invoice details
        details_data = [
            ['Invoice Number:', invoice.invoice_number, 'Date:', invoice.invoice_date.strftime('%d/%m/%Y')],
            ['Project:', project.project_name, 'Client:', client.name]
        ]
        
        if invoice.ra_number and invoice.invoice_type == "tax_invoice":
            details_data.append(['RA Number:', invoice.ra_number, '', ''])
        
        details_table = Table(details_data, colWidths=[80, 200, 60, 120])
        details_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8f9fa')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#dddddd')),
        ]))
        
        elements.append(details_table)
        elements.append(Spacer(1, 20))
        
        # Client information
        elements.append(Paragraph("Bill To:", styles['Heading3']))
        bill_to_text = f"""
        <b>{client.name}</b><br/>
        {client.bill_to_address}<br/>
        <b>GST No:</b> {client.gst_no or 'Not Available'}
        """
        elements.append(Paragraph(bill_to_text, styles['Normal']))
        elements.append(Spacer(1, 20))
        
        # Items table
        table_data = [
            ['S.No', 'Description', 'Unit', 'Qty', 'Rate (₹)', 'Amount (₹)']
        ]
        
        for idx, item in enumerate(invoice.items, 1):
            table_data.append([
                str(idx),
                Paragraph(item.description, styles['Normal']),
                item.unit,
                f"{item.quantity:,.2f}",
                f"₹{item.rate:,.2f}",
                f"₹{item.amount:,.2f}"
            ])
        
        col_widths = [30, 240, 50, 50, 80, 90]
        items_table = Table(table_data, colWidths=col_widths)
        
        items_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#127285')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),
            ('ALIGN', (4, 1), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1.5, colors.HexColor('#cccccc')),
        ]))
        
        elements.append(items_table)
        elements.append(Spacer(1, 20))
        
        # Totals
        totals_data = [
            ['', '', '', '', 'Subtotal:', f"₹{invoice.subtotal:,.2f}"],
            ['', '', '', '', 'GST (18%):', f"₹{invoice.total_gst_amount:,.2f}"],
            ['', '', '', '', 'Total Amount:', f"₹{invoice.total_amount:,.2f}"]
        ]
        
        if invoice.advance_received > 0:
            totals_data.append(['', '', '', '', 'Advance Received:', f"₹{invoice.advance_received:,.2f}"])
            totals_data.append(['', '', '', '', 'Net Amount Due:', f"₹{invoice.net_amount_due:,.2f}"])
        
        totals_table = Table(totals_data, colWidths=col_widths)
        totals_table.setStyle(TableStyle([
            ('ALIGN', (4, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (4, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (4, 0), (-1, -1), 11),
            ('BOX', (4, 0), (-1, -1), 1.5, colors.HexColor('#cccccc')),
            ('BACKGROUND', (4, -1), (-1, -1), colors.HexColor('#e8f4f8')),
        ]))
        
        elements.append(totals_table)
        elements.append(Spacer(1, 30))
        
        # Payment terms
        elements.append(Paragraph(f"<b>Payment Terms:</b> {invoice.payment_terms}", styles['Normal']))
        
        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        return buffer

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

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = await verify_token(credentials.credentials)
    user = await db.users.find_one({"id": payload["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

async def log_activity(user_id: str, user_email: str, user_role: str, action: str, description: str, 
                      project_id: Optional[str] = None, invoice_id: Optional[str] = None):
    log_entry = ActivityLog(
        user_id=user_id,
        user_email=user_email,
        user_role=user_role,
        action=action,
        description=description,
        project_id=project_id,
        invoice_id=invoice_id
    )
    await db.activity_logs.insert_one(log_entry.dict())

# Initialize super admin
async def init_super_admin():
    super_admin_email = "brightboxm@gmail.com"
    existing_user = await db.users.find_one({"email": super_admin_email})
    
    if not existing_user:
        password_hash = await hash_password("admin123")
        super_admin = User(
            email=super_admin_email,
            password_hash=password_hash,
            role=UserRole.SUPER_ADMIN,
            company_name="Activus Industrial Design & Build"
        )
        await db.users.insert_one(super_admin.dict())
        logger.info("Super admin created successfully")

# API Router
from fastapi import APIRouter
api_router = APIRouter(prefix="/api")

# Health endpoints
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "activus-invoice-api", "version": "2.0.0"}

@app.get("/ready")
async def readiness_check():
    try:
        # Check database connection
        await db.command("ping")
        return {"status": "ready", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database not ready: {str(e)}")

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
        
        await log_activity(
            user["id"], user["email"], user["role"], 
            "login", f"User logged in successfully"
        )
        
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

# Enhanced BOQ upload endpoint
@api_router.post("/upload-boq")
async def upload_boq(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    # Validate file
    allowed_content_types = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
    ]
    
    if file.content_type not in allowed_content_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload an Excel file")
    
    # Check file size
    file_content = await file.read()
    if len(file_content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB")
    
    try:
        parser = ExcelParser()
        parsed_data = await parser.parse_excel_file(file_content, file.filename)
        
        await log_activity(
            current_user["id"], current_user["email"], current_user["role"],
            "boq_uploaded", f"Successfully uploaded and parsed BOQ file: {file.filename}"
        )
        
        return parsed_data
        
    except Exception as e:
        logger.error(f"BOQ parsing error: {str(e)}")
        raise HTTPException(status_code=422, detail=f"Failed to parse BOQ: {str(e)}")

# Project endpoints
@api_router.post("/projects")
async def create_project(project_data: dict, current_user: dict = Depends(get_current_user)):
    try:
        # Validate percentages
        abg = project_data.get('abg_percentage', 0)
        ra = project_data.get('ra_percentage', 0)
        erection = project_data.get('erection_percentage', 0)
        pbg = project_data.get('pbg_percentage', 0)
        
        total_percentage = abg + ra + erection + pbg
        if abs(total_percentage - 100.0) > 0.01:
            raise HTTPException(
                status_code=400, 
                detail=f"Percentages must total 100%. Current total: {total_percentage}%"
            )
        
        # Process BOQ items
        boq_items = []
        for item_data in project_data.get('boq_items', []):
            boq_item = BOQItem(
                sr_no=item_data.get('sr_no', len(boq_items) + 1),
                description=item_data['description'],
                unit=item_data.get('unit', 'Nos'),
                quantity=item_data['quantity'],
                rate=item_data['rate'],
                amount=item_data['amount'],
                gst_rate=item_data.get('gst_rate', 18.0),
                billed_quantity=0.0
            )
            boq_items.append(boq_item)
        
        # Create project
        project = Project(
            project_name=project_data['project_name'],
            client_id=project_data['client_id'],
            client_name=project_data['client_name'],
            architect=project_data.get('architect', ''),
            location=project_data.get('location', ''),
            abg_percentage=abg,
            ra_percentage=ra,
            erection_percentage=erection,
            pbg_percentage=pbg,
            total_project_value=project_data['total_project_value'],
            boq_items=boq_items
        )
        
        project_dict = project.dict()
        project_dict['created_by'] = current_user['id']
        
        await db.projects.insert_one(project_dict)
        
        await log_activity(
            current_user["id"], current_user["email"], current_user["role"],
            "project_created", f"Created project: {project.project_name}"
        )
        
        return {"message": "Project created successfully", "project_id": project.id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Project creation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create project: {str(e)}")

@api_router.get("/projects")
async def get_projects(current_user: dict = Depends(get_current_user)):
    try:
        # Fetch projects from MongoDB
        projects_cursor = db.projects.find()
        projects = await projects_cursor.to_list(1000)
        
        # Convert MongoDB documents to proper format
        formatted_projects = []
        for project in projects:
            # Remove MongoDB _id and convert to proper format
            if '_id' in project:
                del project['_id']
            
            # Add calculated fields
            boq_items = project.get('boq_items', [])
            total_billed = 0
            
            # Calculate total billed from BOQ items
            for item in boq_items:
                billed_qty = item.get('billed_quantity', 0)
                rate = item.get('rate', 0)
                total_billed += billed_qty * rate
            
            total_value = project.get('total_project_value', 0)
            completion_percentage = (total_billed / total_value * 100) if total_value > 0 else 0
            
            project['total_billed'] = total_billed
            project['remaining_value'] = total_value - total_billed
            project['completion_percentage'] = round(completion_percentage, 2)
            
            formatted_projects.append(project)
        
        return formatted_projects
        
    except Exception as e:
        logger.error(f"Error fetching projects: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch projects: {str(e)}")

@api_router.get("/projects/{project_id}")
async def get_project(project_id: str, current_user: dict = Depends(get_current_user)):
    try:
        project = await db.projects.find_one({"id": project_id})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Remove MongoDB _id
        if '_id' in project:
            del project['_id']
        
        # Get associated invoices
        invoices_cursor = db.invoices.find({"project_id": project_id})
        invoices = await invoices_cursor.to_list(100)
        
        # Remove MongoDB _id from invoices
        for invoice in invoices:
            if '_id' in invoice:
                del invoice['_id']
        
        # Calculate billing status with proper RA tracking
        billing_status = await calculate_project_billing_status(project, invoices)
        project['billing_status'] = billing_status
        
        return project
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching project: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch project: {str(e)}")

@api_router.get("/projects/{project_id}/ra-tracking")
async def get_project_ra_tracking(project_id: str, current_user: dict = Depends(get_current_user)):
    try:
        project = await db.projects.find_one({"id": project_id})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get all invoices for this project
        invoices_cursor = db.invoices.find({"project_id": project_id, "invoice_type": "tax_invoice"})
        invoices = await invoices_cursor.to_list(100)
        
        # Calculate RA tracking for each BOQ item
        ra_tracking = []
        for item in project.get('boq_items', []):
            # Calculate billed quantity from tax invoices only
            billed_qty = 0
            for invoice in invoices:
                for inv_item in invoice.get('items', []):
                    if inv_item.get('boq_item_id') == item.get('id'):
                        billed_qty += inv_item.get('quantity', 0)
            
            balance_qty = item.get('quantity', 0) - billed_qty
            
            ra_tracking.append({
                'item_id': item.get('id'),
                'description': item.get('description'),
                'unit': item.get('unit', 'Nos'),
                'overall_qty': item.get('quantity', 0),
                'balance_qty': max(0, balance_qty),
                'billed_qty': billed_qty,
                'rate': item.get('rate', 0),
                'gst_mapping': {
                    'total_gst_rate': item.get('gst_rate', 18),
                    'cgst_rate': item.get('gst_rate', 18) / 2,
                    'sgst_rate': item.get('gst_rate', 18) / 2,
                    'igst_rate': item.get('gst_rate', 18)
                },
                'ra_usage': {}
            })
        
        return {
            'ra_tracking': ra_tracking,
            'next_ra': f"RA{len(invoices) + 1}",
            'project_name': project.get('project_name'),
            'client_name': project.get('client_name')
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching RA tracking: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch RA tracking: {str(e)}")

async def calculate_project_billing_status(project: dict, invoices: list) -> dict:
    """Calculate comprehensive project billing status"""
    
    # Get only TAX invoices for RA calculation (not proforma)
    tax_invoices = [inv for inv in invoices if inv.get('invoice_type') == 'tax_invoice']
    
    # Calculate totals
    total_project_value = project.get('total_project_value', 0)
    total_billed = sum(inv.get('total_amount', 0) for inv in tax_invoices)
    remaining_value = total_project_value - total_billed
    completion_percentage = (total_billed / total_project_value * 100) if total_project_value > 0 else 0
    
    # Get next RA number
    next_ra_number = f"RA{len(tax_invoices) + 1}"
    
    # Create BOQ items status for billing table
    boq_items_status = []
    for item in project.get('boq_items', []):
        # Calculate billed quantity from tax invoices only
        billed_qty = 0
        for invoice in tax_invoices:
            for inv_item in invoice.get('items', []):
                if inv_item.get('boq_item_id') == item.get('id'):
                    billed_qty += inv_item.get('quantity', 0)
        
        remaining_qty = item.get('quantity', 0) - billed_qty
        
        boq_items_status.append({
            'id': item.get('id'),
            'description': item.get('description', ''),
            'unit': item.get('unit', 'Nos'),
            'original_quantity': item.get('quantity', 0),
            'billed_quantity': billed_qty,
            'remaining_quantity': max(0, remaining_qty),
            'rate': item.get('rate', 0),
            'gst_rate': item.get('gst_rate', 18),
            'bill_quantity': '',  # Empty by default as requested
            'amount': 0  # Will be calculated on frontend
        })
    
    return {
        'next_ra': next_ra_number,
        'total_billed': total_billed,
        'remaining_value': remaining_value,
        'completion_percentage': round(completion_percentage, 2),
        'previous_invoices': len(tax_invoices),
        'boq_items': boq_items_status,
        'invoice_links': [
            {
                'invoice_number': inv.get('invoice_number'),
                'invoice_id': inv.get('id'),
                'amount': inv.get('total_amount', 0),
                'date': inv.get('invoice_date')
            } for inv in tax_invoices
        ]
    }

# Enhanced invoice endpoints
@api_router.post("/invoices")
async def create_invoice(invoice_data: dict, current_user: dict = Depends(get_current_user)):
    try:
        # Get project and validate
        project = await db.projects.find_one({"id": invoice_data['project_id']})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Validate quantities against BOQ (CRITICAL FIX)
        for item_data in invoice_data.get('items', []):
            boq_item = next((bi for bi in project.get('boq_items', []) 
                           if bi['id'] == item_data['boq_item_id']), None)
            
            if not boq_item:
                raise HTTPException(status_code=400, detail=f"BOQ item not found: {item_data['boq_item_id']}")
            
            # Calculate already billed quantity from TAX invoices only
            existing_invoices = await db.invoices.find({
                "project_id": invoice_data['project_id'],
                "invoice_type": "tax_invoice"  # Only count tax invoices
            }).to_list(100)
            
            billed_qty = sum(
                inv_item.get('quantity', 0) 
                for invoice in existing_invoices 
                for inv_item in invoice.get('items', [])
                if inv_item.get('boq_item_id') == item_data['boq_item_id']
            )
            
            available_qty = boq_item['quantity'] - billed_qty
            requested_qty = item_data.get('quantity', 0)
            
            if requested_qty > available_qty:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Quantity {requested_qty} exceeds available {available_qty} for item: {boq_item['description'][:50]}..."
                )
        
        # Process invoice items
        invoice_items = []
        subtotal = 0
        
        for item_data in invoice_data['items']:
            amount = item_data['quantity'] * item_data['rate']
            
            invoice_item = InvoiceItem(
                boq_item_id=item_data['boq_item_id'],
                description=item_data['description'],
                unit=item_data['unit'],
                quantity=item_data['quantity'],
                rate=item_data['rate'],
                amount=amount,
                gst_rate=item_data.get('gst_rate', 18.0)
            )
            
            invoice_items.append(invoice_item)
            subtotal += amount
        
        # Calculate totals
        total_gst = sum(item.amount * item.gst_rate / 100 for item in invoice_items)
        total_amount = subtotal + total_gst
        
        # Generate invoice number and RA number
        invoice_count = await db.invoices.count_documents({}) + 1
        invoice_number = f"INV-{invoice_count:06d}"
        
        # Only assign RA number for tax invoices
        ra_number = None
        if invoice_data.get('invoice_type') == 'tax_invoice':
            tax_invoice_count = await db.invoices.count_documents({
                "project_id": invoice_data['project_id'],
                "invoice_type": "tax_invoice"
            })
            ra_number = f"RA{tax_invoice_count + 1}"
        
        # Calculate net amount due
        advance_received = float(invoice_data.get('advance_received', 0))
        net_amount_due = total_amount - advance_received
        
        # Create invoice
        invoice = Invoice(
            invoice_number=invoice_number,
            project_id=invoice_data['project_id'],
            client_id=invoice_data['client_id'],
            invoice_type=invoice_data.get('invoice_type', 'tax_invoice'),
            items=invoice_items,
            subtotal=subtotal,
            total_gst_amount=total_gst,
            total_amount=total_amount,
            payment_terms=invoice_data.get('payment_terms', 'Payment due within 30 days'),
            advance_received=advance_received,
            net_amount_due=net_amount_due,
            ra_number=ra_number,
            status="created"
        )
        
        invoice_dict = invoice.dict()
        invoice_dict['created_by'] = current_user['id']
        
        # Insert invoice
        result = await db.invoices.insert_one(invoice_dict)
        
        # Update BOQ billed quantities for TAX invoices only
        if invoice_data.get('invoice_type') == 'tax_invoice':
            await update_boq_billed_quantities(project['id'], invoice_items)
        
        await log_activity(
            current_user["id"], current_user["email"], current_user["role"],
            "invoice_created", f"Created {invoice.invoice_type} invoice: {invoice.invoice_number}",
            project_id=invoice.project_id, invoice_id=invoice.id
        )
        
        return {
            "message": "Invoice created successfully", 
            "invoice_id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "ra_number": ra_number
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Invoice creation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create invoice: {str(e)}")

async def update_boq_billed_quantities(project_id: str, invoice_items: List[InvoiceItem]):
    """Update BOQ item billed quantities"""
    try:
        project = await db.projects.find_one({"id": project_id})
        if not project:
            return
        
        # Update billed quantities
        for invoice_item in invoice_items:
            for i, boq_item in enumerate(project.get('boq_items', [])):
                if boq_item['id'] == invoice_item.boq_item_id:
                    current_billed = boq_item.get('billed_quantity', 0)
                    project['boq_items'][i]['billed_quantity'] = current_billed + invoice_item.quantity
                    break
        
        # Update project in database
        await db.projects.update_one(
            {"id": project_id},
            {"$set": {"boq_items": project['boq_items'], "updated_at": datetime.now(timezone.utc)}}
        )
        
    except Exception as e:
        logger.error(f"Error updating BOQ quantities: {str(e)}")

@api_router.get("/invoices")
async def get_invoices(current_user: dict = Depends(get_current_user)):
    try:
        # Fetch invoices from MongoDB
        invoices_cursor = db.invoices.find()
        invoices = await invoices_cursor.to_list(1000)
        
        # Convert MongoDB documents to proper format
        formatted_invoices = []
        for invoice in invoices:
            # Remove MongoDB _id
            if '_id' in invoice:
                del invoice['_id']
            
            # Enhance with project and client info
            project = await db.projects.find_one({"id": invoice.get('project_id')})
            if project:
                invoice['project_name'] = project.get('project_name', 'Unknown Project')
            
            client = await db.clients.find_one({"id": invoice.get('client_id')})
            if client:
                invoice['client_name'] = client.get('name', 'Unknown Client')
            
            formatted_invoices.append(invoice)
        
        return formatted_invoices
        
    except Exception as e:
        logger.error(f"Error fetching invoices: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch invoices: {str(e)}")

@api_router.get("/invoices/{invoice_id}/pdf")
async def download_invoice_pdf(invoice_id: str, current_user: dict = Depends(get_current_user)):
    try:
        # Get invoice
        invoice_data = await db.invoices.find_one({"id": invoice_id})
        if not invoice_data:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        # Get project
        project_data = await db.projects.find_one({"id": invoice_data['project_id']})
        if not project_data:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get client
        client_data = await db.clients.find_one({"id": invoice_data['client_id']})
        if not client_data:
            raise HTTPException(status_code=404, detail="Client not found")
        
        # Convert to Pydantic models
        invoice = Invoice(**invoice_data)
        project = Project(**project_data)
        client = ClientInfo(**client_data)
        
        # Generate PDF
        pdf_generator = PDFGenerator()
        pdf_buffer = await pdf_generator.generate_invoice_pdf(invoice, project, client)
        
        # Return PDF response
        return Response(
            content=pdf_buffer.getvalue(),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={invoice.invoice_number}.pdf"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PDF generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")

# Client endpoints
@api_router.post("/clients")
async def create_client(client_data: ClientInfo, current_user: dict = Depends(get_current_user)):
    try:
        await db.clients.insert_one(client_data.dict())
        
        await log_activity(
            current_user["id"], current_user["email"], current_user["role"],
            "client_created", f"Created client: {client_data.name}"
        )
        
        return {"message": "Client created successfully", "client_id": client_data.id}
        
    except Exception as e:
        logger.error(f"Client creation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create client: {str(e)}")

@api_router.get("/clients")
async def get_clients(current_user: dict = Depends(get_current_user)):
    try:
        # Fetch clients from MongoDB
        clients_cursor = db.clients.find()
        clients = await clients_cursor.to_list(1000)
        
        # Convert MongoDB documents to proper format
        formatted_clients = []
        for client in clients:
            # Remove MongoDB _id 
            if '_id' in client:
                del client['_id']
            formatted_clients.append(client)
        
        return formatted_clients
        
    except Exception as e:
        logger.error(f"Error fetching clients: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch clients: {str(e)}")

# Logo upload endpoint
@api_router.post("/admin/upload-logo")
async def upload_company_logo(
    logo: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    try:
        if current_user.get("role") != "super_admin":
            raise HTTPException(status_code=403, detail="Only super admin can upload logos")
        
        if not logo.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Only image files are allowed")
        
        contents = await logo.read()
        if len(contents) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size must be less than 5MB")
        
        # Convert to base64 for production deployment
        file_extension = logo.filename.split('.')[-1] if '.' in logo.filename else 'png'
        mime_type = logo.content_type or f'image/{file_extension}'
        
        base64_data = base64.b64encode(contents).decode('utf-8')
        logo_url = f"data:{mime_type};base64,{base64_data}"
        
        unique_filename = f"logo_{uuid.uuid4()}.{file_extension}"
        
        await log_activity(
            current_user["id"], current_user["email"], current_user["role"],
            "logo_uploaded", f"Uploaded company logo: {logo.filename}"
        )
        
        return {
            "message": "Logo uploaded successfully",
            "logo_url": logo_url,
            "filename": unique_filename,
            "size": len(contents)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Logo upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to upload logo: {str(e)}")

# Dashboard stats endpoint
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    try:
        # Get counts
        total_projects = await db.projects.count_documents({})
        total_invoices = await db.invoices.count_documents({})
        total_clients = await db.clients.count_documents({})
        
        # Calculate project value
        projects = await db.projects.find().to_list(1000)
        total_project_value = sum(p.get('total_project_value', 0) for p in projects)
        
        # Calculate invoiced value and pending collections
        invoices = await db.invoices.find().to_list(1000)
        total_invoiced = sum(inv.get('total_amount', 0) for inv in invoices)
        pending_collections = sum(inv.get('net_amount_due', inv.get('total_amount', 0)) for inv in invoices)
        
        return {
            "total_projects": total_projects,
            "total_project_value": total_project_value,
            "total_invoices": total_invoices,
            "total_invoiced_value": total_invoiced,
            "pending_collections": pending_collections,
            "collection_efficiency": ((total_invoiced - pending_collections) / total_invoiced * 100) if total_invoiced > 0 else 0
        }
        
    except Exception as e:
        logger.error(f"Dashboard stats error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard stats: {str(e)}")

# Activity logs endpoint
@api_router.get("/activity-logs")
async def get_activity_logs(current_user: dict = Depends(get_current_user)):
    try:
        if current_user.get("role") != "super_admin":
            raise HTTPException(status_code=403, detail="Only super admin can view activity logs")
        
        logs = await db.activity_logs.find().sort("timestamp", -1).limit(1000).to_list(1000)
        return logs
        
    except Exception as e:
        logger.error(f"Activity logs error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get activity logs: {str(e)}")

# Include API router
app.include_router(api_router)

# Application startup
@app.on_event("startup")
async def startup_event():
    await init_super_admin()
    logger.info("Activus Invoice Management System started successfully")

# Production server configuration
if __name__ == "__main__":
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8001,
        reload=False,
        log_level="info"
    )