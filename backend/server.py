from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import StreamingResponse, JSONResponse, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
import os
import logging
import uuid
import io
import pandas as pd
import openpyxl
from datetime import datetime, timedelta
from decimal import Decimal
import re
from pathlib import Path
from dotenv import load_dotenv
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image as RLImage
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from io import BytesIO
from enum import Enum
import bcrypt
import jwt
from fastapi.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# FastAPI app
app = FastAPI(title="Activus Invoice Management System", version="1.0.0")
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()
SECRET_KEY = "activus_secret_key_2024"

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    INVOICE_CREATOR = "invoice_creator"
    REVIEWER = "reviewer"
    APPROVER = "approver"
    CLIENT = "client"
    VENDOR = "vendor"

class MasterItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    description: str
    unit: str
    standard_rate: float
    category: Optional[str] = None
    last_used_date: Optional[datetime] = None
    usage_count: int = 0
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class InvoiceType(str, Enum):
    PROFORMA = "proforma"
    TAX_INVOICE = "tax_invoice"

class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    REVIEWED = "reviewed"
    APPROVED = "approved"
    PAID = "paid"

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    password_hash: str
    role: UserRole
    company_name: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    email: str
    password: str
    role: UserRole
    company_name: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class ProjectMetadata(BaseModel):
    project_name: Optional[str] = None
    architect: Optional[str] = None
    client: Optional[str] = None
    location: Optional[str] = None
    date: Optional[str] = None

class BOQItem(BaseModel):
    serial_number: str
    description: str
    unit: str
    quantity: float
    rate: float
    amount: float
    category: Optional[str] = None
    billed_quantity: float = 0.0  # Track how much has been billed
    remaining_quantity: Optional[float] = None  # Calculate remaining
    gst_rate: float = 18.0  # GST rate for this item
    is_gst_locked: bool = False  # Lock GST for RA2+ invoices

class InvoiceItem(BaseModel):
    boq_item_id: str  # Reference to original BOQ item
    serial_number: str
    description: str
    unit: str
    quantity: float  # Partial quantity being billed
    rate: float
    amount: float
    gst_rate: float = 18.0
    gst_amount: float = 0.0
    total_with_gst: float = 0.0

class ClientInfo(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    gst_no: Optional[str] = None
    bill_to_address: str
    ship_to_address: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Project(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_name: str
    architect: str
    client_id: str
    client_name: str
    metadata: ProjectMetadata
    boq_items: List[BOQItem]
    total_project_value: float
    advance_received: float = 0.0
    pending_payment: float = 0.0
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Invoice(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str = ""
    ra_number: str = ""  # RA1, RA2, RA3, etc.
    project_id: str
    project_name: str
    client_id: str
    client_name: str
    invoice_type: InvoiceType
    items: List[InvoiceItem]
    subtotal: float = 0.0
    total_gst_amount: float = 0.0
    total_amount: float = 0.0
    is_partial: bool = True  # Most invoices are partial
    billing_percentage: Optional[float] = None  # What % of project is being billed
    cumulative_billed: Optional[float] = None  # Total billed so far including this invoice
    status: InvoiceStatus = InvoiceStatus.DRAFT
    created_by: Optional[str] = None
    reviewed_by: Optional[str] = None
    approved_by: Optional[str] = None
    invoice_date: datetime = Field(default_factory=datetime.utcnow)
    due_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ActivityLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_email: str
    user_role: str
    action: str
    description: str
    project_id: Optional[str] = None
    invoice_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# Excel Parser Class
class ExcelParser:
    def __init__(self):
        self.metadata_patterns = {
            'project_name': [r'project\s*name', r'project\s*:', r'job\s*name'],
            'architect': [r'architect', r'architect\s*name', r'architect\s*:'],
            'client': [r'client', r'client\s*name', r'client\s*:'],
            'location': [r'location', r'site', r'address'],
            'date': [r'date', r'project\s*date']
        }
    
    async def parse_excel_file(self, file_content: bytes, filename: str) -> Dict[str, Any]:
        try:
            workbook = openpyxl.load_workbook(io.BytesIO(file_content), data_only=True)
            worksheet = self._select_worksheet(workbook)
            
            if not worksheet:
                raise ValueError("No valid worksheet found in the Excel file")
            
            # Extract metadata
            metadata = self._extract_metadata(worksheet)
            
            # Extract BOQ items
            items = self._extract_boq_items(worksheet)
            
            if not items:
                logger.warning(f"No BOQ items found in file {filename}")
                # Still allow processing with empty items
            
            # Calculate totals with validation
            total_value = 0.0
            try:
                total_value = sum(item['amount'] for item in items if item.get('amount'))
            except (TypeError, ValueError) as e:
                logger.warning(f"Error calculating total value: {e}")
                total_value = 0.0
            
            return {
                'metadata': metadata,
                'items': items,
                'total_value': total_value,
                'filename': filename,
                'items_count': len(items)
            }
        except Exception as e:
            logger.error(f"Error parsing Excel file {filename}: {e}")
            raise HTTPException(
                status_code=400, 
                detail=f"Error parsing Excel file: {str(e)}. Please ensure the file contains BOQ data in the expected format."
            )
    
    def _select_worksheet(self, workbook: openpyxl.Workbook):
        """Select the appropriate worksheet containing BOQ data"""
        # Priority order for worksheet selection
        preferred_names = ['boq', 'bill of quantities', 'quantities', 'estimate', 'summary', 'sheet1', 'main']
        
        # First try to find by preferred names
        for name in preferred_names:
            for sheet_name in workbook.sheetnames:
                if name.lower() in sheet_name.lower():
                    return workbook[sheet_name]
        
        # If no preferred name found, return the first non-empty sheet
        for sheet_name in workbook.sheetnames:
            worksheet = workbook[sheet_name]
            if worksheet.max_row > 1 and worksheet.max_column > 1:
                return worksheet
        
        # Return active worksheet as last resort
        return workbook.active
    
    def _extract_metadata(self, worksheet) -> Dict[str, Any]:
        metadata = {}
        
        # Search first 20 rows for metadata
        for row_idx in range(1, min(21, worksheet.max_row + 1)):
            for col_idx in range(1, min(10, worksheet.max_column + 1)):
                cell = worksheet.cell(row=row_idx, column=col_idx)
                if cell.value and isinstance(cell.value, str):
                    self._extract_metadata_field(cell.value, worksheet, row_idx, col_idx, metadata)
        
        return metadata
    
    def _extract_metadata_field(self, cell_value: str, worksheet, row_idx: int, col_idx: int, metadata: Dict):
        cell_lower = cell_value.lower().strip()
        
        for field, patterns in self.metadata_patterns.items():
            for pattern in patterns:
                if re.search(pattern, cell_lower):
                    value = self._find_adjacent_value(worksheet, row_idx, col_idx)
                    if value:
                        metadata[field] = value
                        break
    
    def _find_adjacent_value(self, worksheet, row_idx: int, col_idx: int) -> Optional[str]:
        # Check same cell after colon/dash
        current_cell = worksheet.cell(row=row_idx, column=col_idx)
        if current_cell.value and (':' in str(current_cell.value) or '-' in str(current_cell.value)):
            parts = re.split(r'[:\-]', str(current_cell.value), 1)
            if len(parts) > 1 and parts[1].strip():
                return parts[1].strip()
        
        # Check right cell
        right_cell = worksheet.cell(row=row_idx, column=col_idx + 1)
        if right_cell.value and str(right_cell.value).strip():
            return str(right_cell.value).strip()
        
        return None
    
    def _extract_boq_items(self, worksheet) -> List[Dict]:
        items = []
        header_row = self._find_header_row(worksheet)
        
        if not header_row:
            return items
        
        column_mapping = self._map_columns(worksheet, header_row)
        
        for row_idx in range(header_row + 1, worksheet.max_row + 1):
            row_data = self._extract_row_data(worksheet, row_idx, column_mapping)
            
            if self._is_valid_item_row(row_data):
                quantity = self._safe_float_conversion(row_data.get('quantity')) or 0.0
                rate = self._safe_float_conversion(row_data.get('rate')) or 0.0
                amount = self._safe_float_conversion(row_data.get('amount'))
                
                # Calculate amount if not provided
                if amount is None or amount == 0:
                    amount = quantity * rate
                
                items.append({
                    'serial_number': str(row_data.get('serial', row_idx - header_row)),
                    'description': str(row_data.get('description', '')).strip(),
                    'unit': str(row_data.get('unit', 'nos')).strip() or 'nos',
                    'quantity': quantity,
                    'rate': rate,
                    'amount': amount
                })
        
        return items
    
    def _find_header_row(self, worksheet) -> Optional[int]:
        header_keywords = ['description', 'quantity', 'rate', 'amount', 'item', 'particular']
        
        for row_idx in range(1, min(30, worksheet.max_row + 1)):
            row_cells = [str(worksheet.cell(row=row_idx, column=col).value or '').lower() for col in range(1, min(20, worksheet.max_column + 1))]
            row_text = ' '.join(row_cells)
            
            matches = sum(1 for keyword in header_keywords if keyword in row_text)
            if matches >= 3:
                return row_idx
        
        return None
    
    def _map_columns(self, worksheet, header_row: int) -> Dict[str, int]:
        column_mapping = {}
        
        for col_idx in range(1, worksheet.max_column + 1):
            cell_value = worksheet.cell(row=header_row, column=col_idx).value
            if cell_value:
                cell_lower = str(cell_value).lower().strip()
                
                if any(h in cell_lower for h in ['s.no', 'sr.no', 'serial', 'sl']):
                    column_mapping['serial'] = col_idx
                elif any(h in cell_lower for h in ['description', 'item', 'particular']):
                    column_mapping['description'] = col_idx
                elif any(h in cell_lower for h in ['unit', 'uom']):
                    column_mapping['unit'] = col_idx
                elif any(h in cell_lower for h in ['quantity', 'qty']):
                    column_mapping['quantity'] = col_idx
                elif any(h in cell_lower for h in ['rate', 'price', 'unit rate']):
                    column_mapping['rate'] = col_idx
                elif any(h in cell_lower for h in ['amount', 'total']):
                    column_mapping['amount'] = col_idx
        
        return column_mapping
    
    def _extract_row_data(self, worksheet, row_idx: int, column_mapping: Dict[str, int]) -> Dict:
        row_data = {}
        
        for field, col_idx in column_mapping.items():
            cell_value = worksheet.cell(row=row_idx, column=col_idx).value
            row_data[field] = cell_value
        
        return row_data
    
    def _is_valid_item_row(self, row_data: Dict) -> bool:
        description = row_data.get('description', '')
        if not description or not isinstance(description, str) or len(description.strip()) < 3:
            return False
        
        # Must have at least description and one numeric field
        numeric_fields = ['quantity', 'rate', 'amount']
        has_numeric = any(
            self._safe_float_conversion(row_data.get(field)) is not None
            for field in numeric_fields
        )
        
        return has_numeric
    
    def _safe_float_conversion(self, value) -> Optional[float]:
        """Safely convert value to float, handling None and invalid values"""
        if value is None:
            return None
        
        if isinstance(value, (int, float)):
            return float(value)
        
        if isinstance(value, str):
            # Remove common formatting characters
            cleaned = value.strip().replace(',', '').replace('₹', '').replace('Rs.', '').replace('Rs', '')
            if not cleaned:
                return None
            try:
                return float(cleaned)
            except ValueError:
                return None
        
        return None

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
        
        # Build PDF content
        elements = []
        styles = getSampleStyleSheet()
        
        # Add custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#1f4e79'),
            alignment=TA_CENTER,
            spaceAfter=20
        )
        
        header_style = ParagraphStyle(
            'CustomHeader',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#1f4e79'),
            spaceAfter=10
        )
        
        # Company Header
        elements.append(Paragraph("ACTIVUS INDUSTRIAL DESIGN & BUILD LLP", title_style))
        elements.append(Paragraph("One Stop Solution for Industrial Projects", styles['Normal']))
        elements.append(Spacer(1, 20))
        
        # Invoice Title
        invoice_title = f"{invoice.invoice_type.value.upper()} INVOICE"
        elements.append(Paragraph(invoice_title, title_style))
        elements.append(Spacer(1, 20))
        
        # Invoice Details
        details_data = [
            ['Invoice Number:', invoice.invoice_number, 'Date:', invoice.invoice_date.strftime('%d/%m/%Y')],
            ['Project:', project.project_name, 'Client:', client.name],
            ['Architect:', project.architect, '', '']
        ]
        
        details_table = Table(details_data, colWidths=[40*mm, 60*mm, 30*mm, 50*mm])
        details_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        elements.append(details_table)
        elements.append(Spacer(1, 20))
        
        # Client Information
        elements.append(Paragraph("Bill To:", header_style))
        elements.append(Paragraph(client.name, styles['Normal']))
        elements.append(Paragraph(client.bill_to_address, styles['Normal']))
        if client.gst_no:
            elements.append(Paragraph(f"GST No: {client.gst_no}", styles['Normal']))
        elements.append(Spacer(1, 20))
        
        # Items Table
        items_data = [['S.No', 'Description', 'Unit', 'Qty', 'Rate', 'Amount']]
        
        for item in invoice.items:
            items_data.append([
                item.serial_number,
                item.description,
                item.unit,
                str(item.quantity),
                f"₹{item.rate:,.2f}",
                f"₹{item.amount:,.2f}"
            ])
        
        items_table = Table(items_data, colWidths=[15*mm, 80*mm, 20*mm, 20*mm, 30*mm, 35*mm])
        items_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1f4e79')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        
        elements.append(items_table)
        elements.append(Spacer(1, 20))
        
        # Totals
        totals_data = [
            ['Subtotal:', f"₹{invoice.subtotal:,.2f}"],
            ['GST (18%):', f"₹{invoice.total_gst_amount:,.2f}"],
            ['Total Amount:', f"₹{invoice.total_amount:,.2f}"]
        ]
        
        totals_table = Table(totals_data, colWidths=[50*mm, 50*mm])
        totals_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        
        elements.append(totals_table)
        
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
        'exp': datetime.utcnow() + timedelta(days=7)
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

# API Routes
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

@api_router.post("/auth/register")
async def register(user_data: UserCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only super admin can create users")
    
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    password_hash = await hash_password(user_data.password)
    new_user = User(
        email=user_data.email,
        password_hash=password_hash,
        role=user_data.role,
        company_name=user_data.company_name
    )
    
    await db.users.insert_one(new_user.dict())
    
    await log_activity(
        current_user["id"], current_user["email"], current_user["role"],
        "user_created", f"Created new user: {user_data.email} with role: {user_data.role}"
    )
    
    return {"message": "User created successfully", "user_id": new_user.id}

# User Management APIs
@api_router.get("/users", response_model=List[dict])
async def get_users(current_user: dict = Depends(get_current_user)):
    """Get all users (super admin only)"""
    if current_user["role"] != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only super admin can view users")
    
    try:
        users = await db.users.find().to_list(1000)
        
        # Clean user data (remove password hash)
        clean_users = []
        for user in users:
            clean_user = {
                "id": user.get("id"),
                "email": user.get("email"),
                "role": user.get("role"),
                "company_name": user.get("company_name"),
                "is_active": user.get("is_active", True),
                "created_at": user.get("created_at"),
                "last_login": user.get("last_login")
            }
            clean_users.append(clean_user)
        
        return clean_users
        
    except Exception as e:
        logger.error(f"Error fetching users: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch users: {str(e)}")

@api_router.put("/users/{user_id}", response_model=dict)
async def update_user(
    user_id: str,
    update_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update user details (super admin only)"""
    if current_user["role"] != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only super admin can update users")
    
    try:
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID is required")
        
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Only allow updating specific fields
        allowed_fields = ["role", "company_name", "is_active"]
        filtered_data = {k: v for k, v in update_data.items() if k in allowed_fields}
        
        if not filtered_data:
            raise HTTPException(status_code=400, detail="No valid fields to update")
        
        filtered_data["updated_at"] = datetime.utcnow()
        
        await db.users.update_one(
            {"id": user_id},
            {"$set": filtered_data}
        )
        
        await log_activity(
            current_user["id"], current_user["email"], current_user["role"],
            "user_updated", f"Updated user: {user['email']}"
        )
        
        return {"message": "User updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update user: {str(e)}")

@api_router.delete("/users/{user_id}")
async def deactivate_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Deactivate a user (super admin only)"""
    if current_user["role"] != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only super admin can deactivate users")
    
    try:
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID is required")
        
        # Prevent super admin from deactivating themselves
        if user_id == current_user["id"]:
            raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
        
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
        )
        
        await log_activity(
            current_user["id"], current_user["email"], current_user["role"],
            "user_deactivated", f"Deactivated user: {user['email']}"
        )
        
        return {"message": "User deactivated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deactivating user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to deactivate user: {str(e)}")

@api_router.post("/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: str,
    password_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Reset user password (super admin only)"""
    if current_user["role"] != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only super admin can reset passwords")
    
    try:
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID is required")
        
        new_password = password_data.get("new_password")
        if not new_password or len(new_password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")
        
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        password_hash = await hash_password(new_password)
        
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"password_hash": password_hash, "updated_at": datetime.utcnow()}}
        )
        
        await log_activity(
            current_user["id"], current_user["email"], current_user["role"],
            "password_reset", f"Reset password for user: {user['email']}"
        )
        
        return {"message": "Password reset successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resetting password: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to reset password: {str(e)}")

@api_router.post("/upload-boq")
async def upload_boq(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    # Validate file type
    allowed_content_types = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/vnd.ms-excel.sheet.macroEnabled.12'
    ]
    
    allowed_extensions = ['.xlsx', '.xlsm', '.xls']
    
    if file.content_type not in allowed_content_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Please upload an Excel file (.xlsx, .xls, .xlsm). Received: {file.content_type}"
        )
    
    if not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file extension. Please upload an Excel file with .xlsx, .xls, or .xlsm extension"
        )
    
    # Check file size (max 10MB)
    file_content = await file.read()
    if len(file_content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB")
    
    if len(file_content) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded")
    
    try:
        parser = ExcelParser()
        parsed_data = await parser.parse_excel_file(file_content, file.filename)
        
        await log_activity(
            current_user["id"], current_user["email"], current_user["role"],
            "boq_uploaded", f"Successfully uploaded and parsed BOQ file: {file.filename}"
        )
        
        return parsed_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"BOQ parsing error for file {file.filename}: {str(e)}")
        raise HTTPException(
            status_code=422, 
            detail=f"Failed to parse Excel file. Please ensure it's a valid BOQ format. Error: {str(e)}"
        )

@api_router.post("/clients", response_model=dict)
async def create_client(client_data: ClientInfo, current_user: dict = Depends(get_current_user)):
    await db.clients.insert_one(client_data.dict())
    
    await log_activity(
        current_user["id"], current_user["email"], current_user["role"],
        "client_created", f"Created client: {client_data.name}"
    )
    
    return {"message": "Client created successfully", "client_id": client_data.id}

@api_router.get("/clients", response_model=List[ClientInfo])
async def get_clients(current_user: dict = Depends(get_current_user)):
    clients = await db.clients.find().to_list(1000)
    return [ClientInfo(**client) for client in clients]

@api_router.post("/projects", response_model=dict)
async def create_project(project_data: Project, current_user: dict = Depends(get_current_user)):
    try:
        # Set additional fields
        project_data.created_by = current_user["id"]
        project_data.pending_payment = project_data.total_project_value - project_data.advance_received
        project_data.updated_at = datetime.utcnow()
        
        # Validate BOQ items are properly formed
        if not project_data.boq_items:
            raise HTTPException(status_code=400, detail="BOQ items cannot be empty")
        
        # Insert into database
        await db.projects.insert_one(project_data.dict())
        
        # Log activity
        await log_activity(
            current_user["id"], current_user["email"], current_user["role"],
            "project_created", f"Created project: {project_data.project_name}",
            project_id=project_data.id
        )
        
        return {"message": "Project created successfully", "project_id": project_data.id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating project: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create project: {str(e)}")

@api_router.get("/projects", response_model=List[Project])
async def get_projects(current_user: dict = Depends(get_current_user)):
    try:
        projects = await db.projects.find().to_list(1000)
        
        # Filter and validate projects to prevent null errors
        valid_projects = []
        for project in projects:
            if not project or not isinstance(project, dict):
                continue
                
            # Ensure required fields exist with defaults
            cleaned_project = {
                "id": project.get("id", str(uuid.uuid4())),
                "project_name": project.get("project_name", "Untitled Project"),
                "architect": project.get("architect", "Unknown Architect"),
                "client_id": project.get("client_id", ""),
                "client_name": project.get("client_name", "Unknown Client"),
                "metadata": project.get("metadata", {}),
                "boq_items": project.get("boq_items", []),
                "total_project_value": float(project.get("total_project_value", 0)),
                "advance_received": float(project.get("advance_received", 0)),
                "pending_payment": float(project.get("pending_payment", 0)),
                "created_by": project.get("created_by"),
                "created_at": project.get("created_at", datetime.utcnow()),
                "updated_at": project.get("updated_at", datetime.utcnow())
            }
            
            try:
                valid_project = Project(**cleaned_project)
                valid_projects.append(valid_project)
            except Exception as e:
                logger.warning(f"Skipping invalid project {project.get('id', 'unknown')}: {e}")
                continue
        
        return valid_projects
        
    except Exception as e:
        logger.error(f"Error fetching projects: {str(e)}")
        return []

@api_router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str, current_user: dict = Depends(get_current_user)):
    try:
        if not project_id or len(project_id.strip()) == 0:
            raise HTTPException(status_code=400, detail="Project ID is required")
        
        project = await db.projects.find_one({"id": project_id})
        if not project:
            raise HTTPException(status_code=404, detail=f"Project with ID {project_id} not found")
        
        return Project(**project)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving project {project_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@api_router.get("/projects/{project_id}/boq-status")
async def get_project_boq_status(project_id: str, current_user: dict = Depends(get_current_user)):
    """Get BOQ items with billing status for partial invoicing"""
    try:
        project = await db.projects.find_one({"id": project_id})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get all invoices for this project
        invoices = await db.invoices.find({"project_id": project_id}).to_list(1000)
        
        # Calculate billing status for each BOQ item
        boq_items_with_status = []
        for boq_item in project.get("boq_items", []):
            item_id = boq_item.get("id", boq_item.get("serial_number"))
            total_billed = 0.0
            
            # Calculate total billed quantity for this item
            for invoice in invoices:
                for inv_item in invoice.get("items", []):
                    if inv_item.get("boq_item_id") == item_id:
                        total_billed += inv_item.get("quantity", 0)
            
            original_quantity = boq_item.get("quantity", 0)
            remaining_quantity = max(0, original_quantity - total_billed)
            billing_percentage = (total_billed / original_quantity * 100) if original_quantity > 0 else 0
            
            boq_item_status = {
                **boq_item,
                "billed_quantity": total_billed,
                "remaining_quantity": remaining_quantity,
                "billing_percentage": round(billing_percentage, 2),
                "is_fully_billed": remaining_quantity == 0,
                "can_bill": remaining_quantity > 0
            }
            
            boq_items_with_status.append(boq_item_status)
        
        # Calculate project-level billing status
        project_total_value = project.get("total_project_value", 0)
        total_billed_value = sum(invoice.get("subtotal", 0) for invoice in invoices)
        project_billing_percentage = (total_billed_value / project_total_value * 100) if project_total_value > 0 else 0
        
        return {
            "project_id": project_id,
            "project_name": project.get("project_name"),
            "total_project_value": project_total_value,
            "total_billed_value": total_billed_value,
            "remaining_value": project_total_value - total_billed_value,
            "project_billing_percentage": round(project_billing_percentage, 2),
            "total_invoices": len(invoices),
            "next_ra_number": f"RA{len(invoices) + 1}",
            "boq_items": boq_items_with_status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting BOQ status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get BOQ status")

@api_router.post("/invoices", response_model=dict)
async def create_invoice(invoice_data: Invoice, current_user: dict = Depends(get_current_user)):
    try:
        # Get existing invoices for this project to determine RA number
        existing_invoices = await db.invoices.find({"project_id": invoice_data.project_id}).to_list(1000)
        ra_count = len(existing_invoices) + 1
        
        # Generate invoice and RA numbers
        invoice_count = await db.invoices.count_documents({})
        invoice_data.invoice_number = f"INV-{datetime.now().year}-{invoice_count + 1:04d}"
        invoice_data.ra_number = f"RA{ra_count}"
        invoice_data.created_by = current_user["id"]
        
        # Calculate totals and GST
        invoice_data.subtotal = sum(item.amount for item in invoice_data.items)
        invoice_data.total_gst_amount = sum(item.gst_amount for item in invoice_data.items)
        invoice_data.total_amount = invoice_data.subtotal + invoice_data.total_gst_amount
        
        # Calculate billing percentage and cumulative billed
        project = await db.projects.find_one({"id": invoice_data.project_id})
        if project:
            project_total = project.get("total_project_value", 0)
            if project_total > 0:
                invoice_data.billing_percentage = (invoice_data.subtotal / project_total) * 100
                
                # Calculate cumulative billed amount
                previous_invoices_total = sum(inv.get("subtotal", 0) for inv in existing_invoices)
                invoice_data.cumulative_billed = previous_invoices_total + invoice_data.subtotal
        
        # For RA2+ invoices, lock GST rates for previously billed items
        if ra_count > 1:
            # Get all previously billed BOQ item IDs
            previously_billed_items = set()
            for prev_invoice in existing_invoices:
                for item in prev_invoice.get("items", []):
                    previously_billed_items.add(item.get("boq_item_id"))
            
            # Lock GST for items that were previously billed
            for item in invoice_data.items:
                if item.boq_item_id in previously_billed_items:
                    # Find the GST rate from the first invoice
                    for prev_invoice in existing_invoices:
                        for prev_item in prev_invoice.get("items", []):
                            if prev_item.get("boq_item_id") == item.boq_item_id:
                                item.gst_rate = prev_item.get("gst_rate", 18.0)
                                break
                        break
        
        # Update BOQ items in project with billed quantities
        if project:
            updated_boq_items = []
            for boq_item in project.get("boq_items", []):
                # Find corresponding invoice item
                invoice_item = next((item for item in invoice_data.items 
                                   if item.boq_item_id == boq_item.get("id", boq_item.get("serial_number"))), None)
                
                if invoice_item:
                    boq_item["billed_quantity"] = boq_item.get("billed_quantity", 0) + invoice_item.quantity
                    boq_item["remaining_quantity"] = boq_item.get("quantity", 0) - boq_item["billed_quantity"]
                
                updated_boq_items.append(boq_item)
            
            # Update project with new billed quantities
            await db.projects.update_one(
                {"id": invoice_data.project_id},
                {"$set": {"boq_items": updated_boq_items, "updated_at": datetime.utcnow()}}
            )
        
        await db.invoices.insert_one(invoice_data.dict())
        
        await log_activity(
            current_user["id"], current_user["email"], current_user["role"],
            "invoice_created", f"Created {invoice_data.ra_number} {invoice_data.invoice_type} invoice: {invoice_data.invoice_number}",
            project_id=invoice_data.project_id, invoice_id=invoice_data.id
        )
        
        return {
            "message": f"Invoice {invoice_data.ra_number} created successfully", 
            "invoice_id": invoice_data.id,
            "ra_number": invoice_data.ra_number,
            "billing_percentage": invoice_data.billing_percentage
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating invoice: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create invoice: {str(e)}")

@api_router.get("/invoices", response_model=List[Invoice])
async def get_invoices(current_user: dict = Depends(get_current_user)):
    try:
        invoices = await db.invoices.find().to_list(1000)
        
        # Filter and validate invoices to prevent validation errors
        valid_invoices = []
        for invoice in invoices:
            if not invoice or not isinstance(invoice, dict):
                continue
                
            try:
                # Ensure required fields exist with defaults
                cleaned_invoice = {
                    "id": invoice.get("id", str(uuid.uuid4())),
                    "invoice_number": invoice.get("invoice_number", ""),
                    "ra_number": invoice.get("ra_number", ""),
                    "project_id": invoice.get("project_id", ""),
                    "project_name": invoice.get("project_name", ""),
                    "client_id": invoice.get("client_id", ""),
                    "client_name": invoice.get("client_name", ""),
                    "invoice_type": invoice.get("invoice_type", "proforma"),
                    "items": [],
                    "subtotal": float(invoice.get("subtotal", 0)),
                    "total_gst_amount": float(invoice.get("total_gst_amount", invoice.get("gst_amount", 0))),
                    "total_amount": float(invoice.get("total_amount", 0)),
                    "is_partial": invoice.get("is_partial", True),
                    "billing_percentage": invoice.get("billing_percentage"),
                    "cumulative_billed": invoice.get("cumulative_billed"),
                    "status": invoice.get("status", "draft"),
                    "created_by": invoice.get("created_by"),
                    "reviewed_by": invoice.get("reviewed_by"),
                    "approved_by": invoice.get("approved_by"),
                    "invoice_date": invoice.get("invoice_date", datetime.utcnow()),
                    "due_date": invoice.get("due_date"),
                    "created_at": invoice.get("created_at", datetime.utcnow()),
                    "updated_at": invoice.get("updated_at", datetime.utcnow())
                }
                
                # Clean up items to match InvoiceItem model
                for item in invoice.get("items", []):
                    if isinstance(item, dict):
                        cleaned_item = {
                            "boq_item_id": item.get("boq_item_id", item.get("serial_number", str(uuid.uuid4()))),
                            "serial_number": str(item.get("serial_number", "")),
                            "description": str(item.get("description", "")),
                            "unit": str(item.get("unit", "nos")),
                            "quantity": float(item.get("quantity", 0)),
                            "rate": float(item.get("rate", 0)),
                            "amount": float(item.get("amount", 0)),
                            "gst_rate": float(item.get("gst_rate", 18.0)),
                            "gst_amount": float(item.get("gst_amount", 0)),
                            "total_with_gst": float(item.get("total_with_gst", item.get("amount", 0) * 1.18))
                        }
                        cleaned_invoice["items"].append(cleaned_item)
                
                valid_invoice = Invoice(**cleaned_invoice)
                valid_invoices.append(valid_invoice)
                
            except Exception as e:
                logger.warning(f"Skipping invalid invoice {invoice.get('id', 'unknown')}: {e}")
                continue
        
        return valid_invoices
        
    except Exception as e:
        logger.error(f"Error fetching invoices: {str(e)}")
        return []

@api_router.get("/invoices/{invoice_id}/pdf")
async def download_invoice_pdf(invoice_id: str, current_user: dict = Depends(get_current_user)):
    try:
        if not invoice_id or len(invoice_id.strip()) == 0:
            raise HTTPException(status_code=400, detail="Invoice ID is required")
        
        # Get invoice data
        invoice_data = await db.invoices.find_one({"id": invoice_id})
        if not invoice_data:
            raise HTTPException(status_code=404, detail=f"Invoice with ID {invoice_id} not found")
        
        # Get related project data
        project_data = await db.projects.find_one({"id": invoice_data.get("project_id")})
        if not project_data:
            # Create minimal project data if not found
            project_data = {
                "id": invoice_data.get("project_id", "unknown"),
                "project_name": invoice_data.get("project_name", "Unknown Project"),
                "architect": "Unknown Architect",
                "location": "Unknown Location",
                "client_id": invoice_data.get("client_id"),
                "boq_items": [],
                "total_project_value": 0,
                "advance_received": 0,
                "pending_payment": 0,
                "created_by": current_user["id"],
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
        # Get related client data
        client_data = await db.clients.find_one({"id": invoice_data.get("client_id")})
        if not client_data:
            # Create minimal client data if not found
            client_data = {
                "id": invoice_data.get("client_id", "unknown"),
                "name": invoice_data.get("client_name", "Unknown Client"),
                "bill_to_address": "Unknown Address",
                "ship_to_address": "Unknown Address",
                "gst_no": "",
                "contact_person": "",
                "phone": "",
                "email": "",
                "created_at": datetime.utcnow()
            }
        
        # Clean and validate data before PDF generation
        try:
            # Ensure required fields exist with defaults
            cleaned_invoice = {
                "id": invoice_data.get("id", invoice_id),
                "invoice_number": invoice_data.get("invoice_number", "Unknown"),
                "ra_number": invoice_data.get("ra_number", "Unknown"),
                "project_id": invoice_data.get("project_id", ""),
                "project_name": invoice_data.get("project_name", "Unknown Project"),
                "client_id": invoice_data.get("client_id", ""),
                "client_name": invoice_data.get("client_name", "Unknown Client"),
                "invoice_type": invoice_data.get("invoice_type", "proforma"),
                "items": [],
                "subtotal": float(invoice_data.get("subtotal", 0)),
                "total_gst_amount": float(invoice_data.get("total_gst_amount", 0)),
                "total_amount": float(invoice_data.get("total_amount", 0)),
                "is_partial": invoice_data.get("is_partial", True),
                "billing_percentage": invoice_data.get("billing_percentage"),
                "cumulative_billed": invoice_data.get("cumulative_billed"),
                "status": invoice_data.get("status", "draft"),
                "created_by": invoice_data.get("created_by"),
                "reviewed_by": invoice_data.get("reviewed_by"),
                "approved_by": invoice_data.get("approved_by"),
                "invoice_date": invoice_data.get("invoice_date", datetime.utcnow()),
                "due_date": invoice_data.get("due_date"),
                "created_at": invoice_data.get("created_at", datetime.utcnow()),
                "updated_at": invoice_data.get("updated_at", datetime.utcnow())
            }
            
            # Clean items data
            for item in invoice_data.get("items", []):
                if isinstance(item, dict):
                    cleaned_item = {
                        "boq_item_id": item.get("boq_item_id", item.get("serial_number", str(len(cleaned_invoice["items"]) + 1))),
                        "serial_number": str(item.get("serial_number", len(cleaned_invoice["items"]) + 1)),
                        "description": str(item.get("description", "Unknown Item")),
                        "unit": str(item.get("unit", "nos")),
                        "quantity": float(item.get("quantity", 0)),
                        "rate": float(item.get("rate", 0)),
                        "amount": float(item.get("amount", 0)),
                        "gst_rate": float(item.get("gst_rate", 18.0)),
                        "gst_amount": float(item.get("gst_amount", 0)),
                        "total_with_gst": float(item.get("total_with_gst", 0))
                    }
                    cleaned_invoice["items"].append(cleaned_item)
            
            # Create model instances with error handling
            invoice = Invoice(**cleaned_invoice)
            project = Project(**project_data)
            client = ClientInfo(**client_data)
            
        except Exception as validation_error:
            logger.error(f"Data validation error for invoice {invoice_id}: {str(validation_error)}")
            # Return a simple error PDF instead of failing
            error_pdf = create_error_pdf(f"Invoice {invoice_data.get('invoice_number', 'Unknown')}", str(validation_error))
            return Response(
                content=error_pdf,
                media_type="application/pdf",
                headers={
                    "Content-Type": "application/pdf",
                    "Content-Disposition": f"inline; filename=invoice_error_{invoice_id}.pdf",
                    "Cache-Control": "no-cache"
                }
            )
        
        # Generate PDF
        try:
            pdf_generator = PDFGenerator()
            pdf_buffer = await pdf_generator.generate_invoice_pdf(invoice, project, client)
            
            # Convert BytesIO to bytes for response
            pdf_content = pdf_buffer.getvalue()
            
            if len(pdf_content) < 100:  # Check if PDF is too small (likely an error)
                raise Exception("Generated PDF is too small - likely incomplete")
            
            await log_activity(
                current_user["id"], current_user["email"], current_user["role"],
                "invoice_downloaded", f"Downloaded PDF for invoice: {invoice.invoice_number}",
                invoice_id=invoice_id
            )
            
            # Return as inline response for viewing
            return Response(
                content=pdf_content,
                media_type="application/pdf",
                headers={
                    "Content-Type": "application/pdf",
                    "Content-Disposition": f"inline; filename=invoice_{invoice.invoice_number}.pdf",
                    "Content-Length": str(len(pdf_content)),
                    "Cache-Control": "no-cache"
                }
            )
            
        except Exception as pdf_error:
            logger.error(f"PDF generation error for invoice {invoice_id}: {str(pdf_error)}")
            # Return a simple error PDF
            error_pdf = create_error_pdf(f"Invoice {invoice_data.get('invoice_number', 'Unknown')}", f"PDF generation failed: {str(pdf_error)}")
            return Response(
                content=error_pdf,
                media_type="application/pdf",
                headers={"Content-Disposition": f"inline; filename=invoice_error_{invoice_id}.pdf"}
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error downloading invoice PDF {invoice_id}: {str(e)}")
        # Return error PDF instead of HTTP error
        try:
            error_pdf = create_error_pdf("Invoice Error", f"Failed to generate PDF: {str(e)}")
            return Response(
                content=error_pdf,
                media_type="application/pdf", 
                headers={"Content-Disposition": f"inline; filename=invoice_error_{invoice_id}.pdf"}
            )
        except:
            raise HTTPException(status_code=500, detail=f"Critical error: {str(e)}")

def create_error_pdf(title: str, error_message: str) -> bytes:
    """Create a simple error PDF when regular PDF generation fails"""
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.units import inch
        from reportlab.lib import colors
        import io
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, 
                              rightMargin=inch, leftMargin=inch, 
                              topMargin=inch, bottomMargin=inch)
        
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Title'],
            fontSize=24,
            spaceAfter=30,
            textColor=colors.red,
            alignment=1  # Center alignment
        )
        
        error_style = ParagraphStyle(
            'ErrorStyle',
            parent=styles['Normal'],
            fontSize=12,
            spaceAfter=20,
            textColor=colors.black
        )
        
        content = []
        content.append(Paragraph(f"Error: {title}", title_style))
        content.append(Spacer(1, 20))
        content.append(Paragraph(f"Details: {error_message}", error_style))
        content.append(Spacer(1, 20))
        content.append(Paragraph("Please contact support for assistance.", error_style))
        
        doc.build(content)
        buffer.seek(0)
        return buffer.read()
        
    except Exception as e:
        # If even error PDF creation fails, return minimal PDF
        return b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/Resources <<\n/Font <<\n/F1 4 0 R\n>>\n>>\n/MediaBox [0 0 612 792]\n/Contents 5 0 R\n>>\nendobj\n4 0 obj\n<<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Times-Roman\n>>\nendobj\n5 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n72 720 Td\n(PDF Generation Error) Tj\nET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000079 00000 n \n0000000173 00000 n \n0000000301 00000 n \n0000000380 00000 n \ntrailer\n<<\n/Size 6\n/Root 1 0 R\n>>\nstartxref\n492\n%%EOF"

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    total_projects = await db.projects.count_documents({})
    total_invoices = await db.invoices.count_documents({})
    
    # Calculate financial stats
    pipeline = [
        {"$group": {
            "_id": None,
            "total_invoiced": {"$sum": "$total_amount"},
            "total_advance": {"$sum": "$advance_received"}
        }}
    ]
    
    financial_stats = await db.projects.aggregate(pipeline).to_list(1)
    total_invoiced = financial_stats[0]["total_invoiced"] if financial_stats else 0
    total_advance = financial_stats[0]["total_advance"] if financial_stats else 0
    
    pending_payment = total_invoiced - total_advance
    
    return {
        "total_projects": total_projects,
        "total_invoices": total_invoices,
        "total_invoiced_value": total_invoiced,
        "advance_received": total_advance,
        "pending_payment": pending_payment
    }

@api_router.get("/activity-logs")
async def get_activity_logs(
    skip: int = 0, 
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only super admin can view logs")
    
    logs = await db.activity_logs.find().skip(skip).limit(limit).sort("timestamp", -1).to_list(limit)
    return [ActivityLog(**log) for log in logs]

# Item Master Management
@api_router.post("/item-master", response_model=dict)
async def create_master_item(item_data: MasterItem, current_user: dict = Depends(get_current_user)):
    """Create a new master item"""
    try:
        item_data.created_by = current_user["id"]
        item_data.updated_at = datetime.utcnow()
        
        # Check if similar item already exists
        import re as regex_module
        escaped_description = regex_module.escape(item_data.description)
        existing_item = await db.master_items.find_one({
            "description": {"$regex": f"^{escaped_description}$", "$options": "i"},
            "unit": item_data.unit
        })
        
        if existing_item:
            raise HTTPException(status_code=400, detail="Similar item already exists in master")
        
        await db.master_items.insert_one(item_data.dict())
        
        await log_activity(
            current_user["id"], current_user["email"], current_user["role"],
            "master_item_created", f"Created master item: {item_data.description} ({item_data.unit})"
        )
        
        return {"message": "Master item created successfully", "item_id": item_data.id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating master item: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create master item: {str(e)}")

@api_router.get("/item-master", response_model=List[MasterItem])
async def get_master_items(
    category: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all master items with optional filtering"""
    try:
        query = {}
        
        if category:
            query["category"] = category
            
        if search:
            query["$or"] = [
                {"description": {"$regex": search, "$options": "i"}},
                {"category": {"$regex": search, "$options": "i"}}
            ]
        
        items = await db.master_items.find(query).sort("description", 1).to_list(1000)
        return [MasterItem(**item) for item in items]
        
    except Exception as e:
        logger.error(f"Error fetching master items: {str(e)}")
        return []

@api_router.put("/item-master/{item_id}", response_model=dict)
async def update_master_item(
    item_id: str, 
    updated_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update a master item"""
    try:
        if not item_id:
            raise HTTPException(status_code=400, detail="Item ID is required")
        
        item = await db.master_items.find_one({"id": item_id})
        if not item:
            raise HTTPException(status_code=404, detail="Master item not found")
        
        # Update only allowed fields
        allowed_fields = ["description", "unit", "standard_rate", "category"]
        update_data = {k: v for k, v in updated_data.items() if k in allowed_fields}
        update_data["updated_at"] = datetime.utcnow()
        
        await db.master_items.update_one(
            {"id": item_id},
            {"$set": update_data}
        )
        
        await log_activity(
            current_user["id"], current_user["email"], current_user["role"],
            "master_item_updated", f"Updated master item: {item['description']}"
        )
        
        return {"message": "Master item updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating master item: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update master item: {str(e)}")

@api_router.delete("/item-master/{item_id}")
async def delete_master_item(item_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a master item"""
    try:
        if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.INVOICE_CREATOR]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        item = await db.master_items.find_one({"id": item_id})
        if not item:
            raise HTTPException(status_code=404, detail="Master item not found")
        
        await db.master_items.delete_one({"id": item_id})
        
        await log_activity(
            current_user["id"], current_user["email"], current_user["role"],
            "master_item_deleted", f"Deleted master item: {item['description']}"
        )
        
        return {"message": "Master item deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting master item: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete master item: {str(e)}")

@api_router.post("/item-master/auto-populate")
async def auto_populate_master_items(current_user: dict = Depends(get_current_user)):
    """Auto-populate master items from existing BOQ items across all projects"""
    try:
        if current_user["role"] not in [UserRole.SUPER_ADMIN, UserRole.INVOICE_CREATOR]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Get all projects and extract unique BOQ items
        projects = await db.projects.find().to_list(1000)
        unique_items = {}
        
        for project in projects:
            for boq_item in project.get("boq_items", []):
                description = boq_item.get("description", "").strip()
                unit = boq_item.get("unit", "nos").strip()
                rate = boq_item.get("rate", 0)
                
                if description and len(description) > 3:
                    key = f"{description.lower()}_{unit.lower()}"
                    
                    if key not in unique_items:
                        unique_items[key] = {
                            "description": description,
                            "unit": unit,
                            "rates": [rate],
                            "count": 1
                        }
                    else:
                        unique_items[key]["rates"].append(rate)
                        unique_items[key]["count"] += 1
        
        # Create master items
        created_count = 0
        for item_data in unique_items.values():
            # Calculate average rate
            valid_rates = [r for r in item_data["rates"] if r > 0]
            avg_rate = sum(valid_rates) / len(valid_rates) if valid_rates else 0
            
            # Check if item already exists
            import re as regex_module
            escaped_description = regex_module.escape(item_data['description'])
            existing = await db.master_items.find_one({
                "description": {"$regex": f"^{escaped_description}$", "$options": "i"},
                "unit": item_data["unit"]
            })
            
            if not existing:
                master_item = MasterItem(
                    description=item_data["description"],
                    unit=item_data["unit"],
                    standard_rate=avg_rate,
                    usage_count=item_data["count"],
                    created_by=current_user["id"]
                )
                
                await db.master_items.insert_one(master_item.dict())
                created_count += 1
        
        await log_activity(
            current_user["id"], current_user["email"], current_user["role"],
            "master_items_auto_populated", f"Auto-populated {created_count} master items from existing BOQ data"
        )
        
        return {
            "message": f"Successfully created {created_count} master items",
            "created_count": created_count,
            "total_unique_items": len(unique_items)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error auto-populating master items: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to auto-populate master items: {str(e)}")

# Smart Search and Filters
@api_router.get("/search")
async def global_search(
    query: str,
    entity_type: Optional[str] = None,  # projects, clients, invoices, all
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """Global search across projects, clients, and invoices"""
    try:
        results = {"projects": [], "clients": [], "invoices": [], "total_count": 0}
        
        search_regex = {"$regex": query, "$options": "i"}
        
        # Search projects
        if not entity_type or entity_type in ["projects", "all"]:
            project_query = {"$or": [
                {"project_name": search_regex},
                {"client_name": search_regex},
                {"architect": search_regex}
            ]}
            projects = await db.projects.find(project_query).limit(limit).to_list(limit)
            results["projects"] = [
                {
                    "id": p.get("id"),
                    "project_name": p.get("project_name"),
                    "client_name": p.get("client_name"),
                    "architect": p.get("architect"),
                    "total_value": p.get("total_project_value", 0),
                    "type": "project"
                } for p in projects
            ]
        
        # Search clients
        if not entity_type or entity_type in ["clients", "all"]:
            client_query = {"$or": [
                {"name": search_regex},
                {"bill_to_address": search_regex},
                {"gst_no": search_regex}
            ]}
            clients = await db.clients.find(client_query).limit(limit).to_list(limit)
            results["clients"] = [
                {
                    "id": c.get("id"),
                    "name": c.get("name"),
                    "bill_to_address": c.get("bill_to_address"),
                    "gst_no": c.get("gst_no"),
                    "type": "client"
                } for c in clients
            ]
        
        # Search invoices
        if not entity_type or entity_type in ["invoices", "all"]:
            invoice_query = {"$or": [
                {"invoice_number": search_regex},
                {"ra_number": search_regex},
                {"project_name": search_regex},
                {"client_name": search_regex}
            ]}
            invoices = await db.invoices.find(invoice_query).limit(limit).to_list(limit)
            results["invoices"] = [
                {
                    "id": i.get("id"),
                    "invoice_number": i.get("invoice_number"),
                    "ra_number": i.get("ra_number"),
                    "project_name": i.get("project_name"),
                    "client_name": i.get("client_name"),
                    "total_amount": i.get("total_amount", 0),
                    "status": i.get("status"),
                    "type": "invoice"
                } for i in invoices
            ]
        
        results["total_count"] = len(results["projects"]) + len(results["clients"]) + len(results["invoices"])
        
        await log_activity(
            current_user["id"], current_user["email"], current_user["role"],
            "global_search", f"Performed global search for: {query}"
        )
        
        return results
        
    except Exception as e:
        logger.error(f"Error in global search: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@api_router.get("/filters/projects")
async def get_filtered_projects(
    client_id: Optional[str] = None,
    architect: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    min_value: Optional[float] = None,
    max_value: Optional[float] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get filtered projects with advanced filtering"""
    try:
        query = {}
        
        if client_id:
            query["client_id"] = client_id
            
        if architect:
            query["architect"] = {"$regex": architect, "$options": "i"}
            
        if date_from or date_to:
            date_query = {}
            if date_from:
                date_query["$gte"] = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            if date_to:
                date_query["$lte"] = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            query["created_at"] = date_query
            
        if min_value or max_value:
            value_query = {}
            if min_value:
                value_query["$gte"] = min_value
            if max_value:
                value_query["$lte"] = max_value
            query["total_project_value"] = value_query
            
        projects = await db.projects.find(query).sort("created_at", -1).to_list(1000)
        
        # Filter and validate projects (same as get_projects endpoint)
        valid_projects = []
        for project in projects:
            if not project or not isinstance(project, dict):
                continue
                
            cleaned_project = {
                "id": project.get("id", str(uuid.uuid4())),
                "project_name": project.get("project_name", "Untitled Project"),
                "architect": project.get("architect", "Unknown Architect"),
                "client_id": project.get("client_id", ""),
                "client_name": project.get("client_name", "Unknown Client"),
                "metadata": project.get("metadata", {}),
                "boq_items": project.get("boq_items", []),
                "total_project_value": float(project.get("total_project_value", 0)),
                "advance_received": float(project.get("advance_received", 0)),
                "pending_payment": float(project.get("pending_payment", 0)),
                "created_by": project.get("created_by"),
                "created_at": project.get("created_at", datetime.utcnow()),
                "updated_at": project.get("updated_at", datetime.utcnow())
            }
            
            try:
                valid_project = Project(**cleaned_project)
                valid_projects.append(valid_project)
            except Exception as e:
                logger.warning(f"Skipping invalid project {project.get('id', 'unknown')}: {e}")
                continue
        
        return valid_projects
        
    except Exception as e:
        logger.error(f"Error filtering projects: {str(e)}")
        return []

@api_router.get("/filters/invoices")
async def get_filtered_invoices(
    status: Optional[str] = None,
    invoice_type: Optional[str] = None,
    project_id: Optional[str] = None,
    client_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get filtered invoices with advanced filtering"""
    try:
        query = {}
        
        if status:
            query["status"] = status
            
        if invoice_type:
            query["invoice_type"] = invoice_type
            
        if project_id:
            query["project_id"] = project_id
            
        if client_id:
            query["client_id"] = client_id
            
        if date_from or date_to:
            date_query = {}
            if date_from:
                date_query["$gte"] = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            if date_to:
                date_query["$lte"] = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            query["created_at"] = date_query
            
        if min_amount or max_amount:
            amount_query = {}
            if min_amount:
                amount_query["$gte"] = min_amount
            if max_amount:
                amount_query["$lte"] = max_amount
            query["total_amount"] = amount_query
        
        invoices = await db.invoices.find(query).sort("created_at", -1).to_list(1000)
        
        # Use the same validation logic as get_invoices endpoint
        valid_invoices = []
        for invoice in invoices:
            if not invoice or not isinstance(invoice, dict):
                continue
                
            try:
                cleaned_invoice = {
                    "id": invoice.get("id", str(uuid.uuid4())),
                    "invoice_number": invoice.get("invoice_number", ""),
                    "ra_number": invoice.get("ra_number", ""),
                    "project_id": invoice.get("project_id", ""),
                    "project_name": invoice.get("project_name", ""),
                    "client_id": invoice.get("client_id", ""),
                    "client_name": invoice.get("client_name", ""),
                    "invoice_type": invoice.get("invoice_type", "proforma"),
                    "items": [],
                    "subtotal": float(invoice.get("subtotal", 0)),
                    "total_gst_amount": float(invoice.get("total_gst_amount", invoice.get("gst_amount", 0))),
                    "total_amount": float(invoice.get("total_amount", 0)),
                    "is_partial": invoice.get("is_partial", True),
                    "billing_percentage": invoice.get("billing_percentage"),
                    "cumulative_billed": invoice.get("cumulative_billed"),
                    "status": invoice.get("status", "draft"),
                    "created_by": invoice.get("created_by"),
                    "reviewed_by": invoice.get("reviewed_by"),
                    "approved_by": invoice.get("approved_by"),
                    "invoice_date": invoice.get("invoice_date", datetime.utcnow()),
                    "due_date": invoice.get("due_date"),
                    "created_at": invoice.get("created_at", datetime.utcnow()),
                    "updated_at": invoice.get("updated_at", datetime.utcnow())
                }
                
                # Clean up items
                for item in invoice.get("items", []):
                    if isinstance(item, dict):
                        cleaned_item = {
                            "boq_item_id": item.get("boq_item_id", item.get("serial_number", str(uuid.uuid4()))),
                            "serial_number": str(item.get("serial_number", "")),
                            "description": str(item.get("description", "")),
                            "unit": str(item.get("unit", "nos")),
                            "quantity": float(item.get("quantity", 0)),
                            "rate": float(item.get("rate", 0)),
                            "amount": float(item.get("amount", 0)),
                            "gst_rate": float(item.get("gst_rate", 18.0)),
                            "gst_amount": float(item.get("gst_amount", 0)),
                            "total_with_gst": float(item.get("total_with_gst", item.get("amount", 0) * 1.18))
                        }
                        cleaned_invoice["items"].append(cleaned_item)
                
                valid_invoice = Invoice(**cleaned_invoice)
                valid_invoices.append(valid_invoice)
                
            except Exception as e:
                logger.warning(f"Skipping invalid invoice {invoice.get('id', 'unknown')}: {e}")
                continue
        
        return valid_invoices
        
    except Exception as e:
        logger.error(f"Error filtering invoices: {str(e)}")
        return []

# Reports and Insights
@api_router.get("/reports/gst-summary")
async def get_gst_summary(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get GST summary report with tax breakdown"""
    try:
        query = {}
        if date_from or date_to:
            date_query = {}
            if date_from:
                date_query["$gte"] = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            if date_to:
                date_query["$lte"] = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            query["created_at"] = date_query
        
        invoices = await db.invoices.find(query).to_list(1000)
        
        gst_summary = {
            "total_invoices": len(invoices),
            "total_taxable_amount": 0,
            "total_gst_amount": 0,
            "total_amount_with_gst": 0,
            "gst_breakdown": {},
            "monthly_breakdown": {},
            "invoice_type_breakdown": {"proforma": 0, "tax_invoice": 0}
        }
        
        for invoice in invoices:
            subtotal = invoice.get("subtotal", 0)
            gst_amount = invoice.get("total_gst_amount", invoice.get("gst_amount", 0))
            total_amount = invoice.get("total_amount", 0)
            invoice_type = invoice.get("invoice_type", "proforma")
            
            gst_summary["total_taxable_amount"] += subtotal
            gst_summary["total_gst_amount"] += gst_amount
            gst_summary["total_amount_with_gst"] += total_amount
            gst_summary["invoice_type_breakdown"][invoice_type] += total_amount
            
            # Monthly breakdown
            created_at = invoice.get("created_at", datetime.utcnow())
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            
            month_key = created_at.strftime("%Y-%m")
            if month_key not in gst_summary["monthly_breakdown"]:
                gst_summary["monthly_breakdown"][month_key] = {
                    "month": created_at.strftime("%B %Y"),
                    "total_invoices": 0,
                    "taxable_amount": 0,
                    "gst_amount": 0,
                    "total_amount": 0
                }
            
            gst_summary["monthly_breakdown"][month_key]["total_invoices"] += 1
            gst_summary["monthly_breakdown"][month_key]["taxable_amount"] += subtotal
            gst_summary["monthly_breakdown"][month_key]["gst_amount"] += gst_amount
            gst_summary["monthly_breakdown"][month_key]["total_amount"] += total_amount
            
            # GST rate breakdown
            for item in invoice.get("items", []):
                gst_rate = item.get("gst_rate", 18.0)
                item_gst_amount = item.get("gst_amount", 0)
                
                if gst_rate not in gst_summary["gst_breakdown"]:
                    gst_summary["gst_breakdown"][gst_rate] = {
                        "rate": gst_rate,
                        "taxable_amount": 0,
                        "gst_amount": 0,
                        "total_amount": 0
                    }
                
                gst_summary["gst_breakdown"][gst_rate]["taxable_amount"] += item.get("amount", 0)
                gst_summary["gst_breakdown"][gst_rate]["gst_amount"] += item_gst_amount
                gst_summary["gst_breakdown"][gst_rate]["total_amount"] += item.get("total_with_gst", 0)
        
        # Convert dict to list for better frontend handling
        gst_summary["monthly_breakdown"] = list(gst_summary["monthly_breakdown"].values())
        gst_summary["gst_breakdown"] = list(gst_summary["gst_breakdown"].values())
        
        await log_activity(
            current_user["id"], current_user["email"], current_user["role"],
            "gst_report_generated", f"Generated GST summary report"
        )
        
        return gst_summary
        
    except Exception as e:
        logger.error(f"Error generating GST summary: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate GST summary: {str(e)}")

@api_router.get("/reports/insights")
async def get_insights(current_user: dict = Depends(get_current_user)):
    """Get business insights and analytics"""
    try:
        # Get current date
        now = datetime.utcnow()
        current_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_month = (current_month - timedelta(days=1)).replace(day=1)
        
        # Basic counts
        total_projects = await db.projects.count_documents({})
        total_clients = await db.clients.count_documents({})
        total_invoices = await db.invoices.count_documents({})
        
        # Financial data
        projects = await db.projects.find().to_list(1000)
        invoices = await db.invoices.find().to_list(1000)
        
        # Calculate project insights
        total_project_value = sum(p.get("total_project_value", 0) for p in projects)
        total_advance_received = sum(p.get("advance_received", 0) for p in projects)
        total_pending_payment = sum(p.get("pending_payment", 0) for p in projects)
        
        # Calculate invoice insights
        total_invoiced_value = sum(i.get("total_amount", 0) for i in invoices)
        
        # Monthly trends (last 6 months)
        monthly_data = {}
        for i in range(6):
            month_start = (current_month - timedelta(days=i * 30)).replace(day=1)
            month_end = (month_start + timedelta(days=31)).replace(day=1) - timedelta(seconds=1)
            month_key = month_start.strftime("%Y-%m")
            
            monthly_invoices = [
                inv for inv in invoices 
                if month_start <= datetime.fromisoformat(str(inv.get("created_at", now)).replace('Z', '+00:00')) <= month_end
            ]
            
            monthly_data[month_key] = {
                "month": month_start.strftime("%B %Y"),
                "invoices_count": len(monthly_invoices),
                "invoices_value": sum(inv.get("total_amount", 0) for inv in monthly_invoices)
            }
        
        # Top clients by value
        client_values = {}
        for project in projects:
            client_name = project.get("client_name", "Unknown")
            client_values[client_name] = client_values.get(client_name, 0) + project.get("total_project_value", 0)
        
        top_clients = sorted(
            [{"name": k, "total_value": v} for k, v in client_values.items()],
            key=lambda x: x["total_value"],
            reverse=True
        )[:5]
        
        # Active users (users who performed actions in last 30 days)
        thirty_days_ago = now - timedelta(days=30)
        recent_logs = await db.activity_logs.find({
            "timestamp": {"$gte": thirty_days_ago}
        }).to_list(1000)
        
        active_users = len(set(log.get("user_email") for log in recent_logs))
        
        insights = {
            "overview": {
                "total_projects": total_projects,
                "total_clients": total_clients,
                "total_invoices": total_invoices,
                "active_users": active_users
            },
            "financial": {
                "total_project_value": total_project_value,
                "total_advance_received": total_advance_received,
                "total_pending_payment": total_pending_payment,
                "total_invoiced_value": total_invoiced_value,
                "collection_percentage": (total_advance_received / total_project_value * 100) if total_project_value > 0 else 0
            },
            "trends": {
                "monthly_data": list(monthly_data.values()),
                "top_clients": top_clients
            },
            "performance": {
                "avg_project_value": total_project_value / total_projects if total_projects > 0 else 0,
                "avg_invoice_value": total_invoiced_value / total_invoices if total_invoices > 0 else 0,
                "projects_per_client": total_projects / total_clients if total_clients > 0 else 0
            }
        }
        
        await log_activity(
            current_user["id"], current_user["email"], current_user["role"],
            "insights_report_generated", f"Generated business insights report"
        )
        
        return insights
        
    except Exception as e:
        logger.error(f"Error generating insights: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate insights: {str(e)}")

@api_router.get("/reports/client-summary/{client_id}")
async def get_client_summary(client_id: str, current_user: dict = Depends(get_current_user)):
    """Get detailed summary for a specific client"""
    try:
        client = await db.clients.find_one({"id": client_id})
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        
        # Get client's projects and invoices
        projects = await db.projects.find({"client_id": client_id}).to_list(1000)
        invoices = await db.invoices.find({"client_id": client_id}).to_list(1000)
        
        # Clean up data to remove ObjectIds and ensure JSON serialization
        def clean_data(data):
            if isinstance(data, list):
                return [clean_data(item) for item in data]
            elif isinstance(data, dict):
                cleaned = {}
                for k, v in data.items():
                    if k == '_id':  # Skip MongoDB ObjectId
                        continue
                    cleaned[k] = clean_data(v)
                return cleaned
            else:
                return data
        
        clean_client = clean_data(client)
        clean_projects = clean_data(projects)
        clean_invoices = clean_data(invoices)
        
        summary = {
            "client_info": clean_client,
            "projects_count": len(clean_projects),
            "invoices_count": len(clean_invoices),
            "total_project_value": sum(p.get("total_project_value", 0) for p in clean_projects),
            "total_invoiced_value": sum(i.get("total_amount", 0) for i in clean_invoices),
            "total_advance_received": sum(p.get("advance_received", 0) for p in clean_projects),
            "pending_amount": sum(p.get("pending_payment", 0) for p in clean_projects),
            "projects": clean_projects,
            "recent_invoices": sorted(clean_invoices, key=lambda x: x.get("created_at", datetime.min), reverse=True)[:5]
        }
        
        return summary
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating client summary: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate client summary: {str(e)}")

# Include router
app.include_router(api_router)

@app.on_event("startup")
async def startup_event():
    await init_super_admin()
    logger.info("Application started successfully")

@app.on_event("shutdown")
async def shutdown_event():
    client.close()
    logger.info("Application shutdown")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)