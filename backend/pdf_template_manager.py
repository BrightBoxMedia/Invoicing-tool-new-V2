#!/usr/bin/env python3
"""
PDF Template Management System
Professional solution for managing invoice PDF templates with admin interface
"""

from pydantic import BaseModel
from typing import Optional, Dict, Any, List, Union
import json
from datetime import datetime, timezone

# Canvas Element Models for Canva-like functionality
class CanvasElementStyle(BaseModel):
    """Styling properties for canvas elements"""
    fontSize: Optional[float] = 12.0
    fontWeight: Optional[str] = "normal"
    color: Optional[str] = "#000000"
    backgroundColor: Optional[str] = None
    padding: Optional[float] = 0
    textAlign: Optional[str] = "left"

class CanvasElement(BaseModel):
    """Individual canvas element (text, text-group, info-section, etc.)"""
    type: str  # text, text-group, info-section, project-info, table, etc.
    x: float = 0.0  # X position
    y: float = 0.0  # Y position  
    width: Optional[float] = 100.0  # Width
    height: Optional[float] = 50.0  # Height
    content: Union[str, Dict[str, Any]] = ""  # Content (string or nested dict)
    style: CanvasElementStyle = CanvasElementStyle()
    editable: bool = True
    zIndex: Optional[int] = 10

class PDFTemplateConfig(BaseModel):
    """PDF Template Configuration Model"""
    id: str = "default"
    name: str = "Default Invoice Template"
    
    # Page Settings
    page_size: str = "A4"  # A4, Letter
    margin_top: float = 15.0  # mm
    margin_bottom: float = 20.0  # mm
    margin_left: float = 20.0  # mm
    margin_right: float = 20.0  # mm
    
    # Header Settings
    header_tax_invoice_font_size: float = 18.0
    header_tax_invoice_alignment: str = "CENTER"  # LEFT, CENTER, RIGHT
    header_tax_invoice_color: str = "#000000"
    
    # Logo Settings  
    logo_width: float = 120.0  # pixels
    logo_height: float = 60.0  # pixels
    logo_position: str = "TOP_RIGHT"  # TOP_LEFT, TOP_RIGHT, TOP_CENTER
    logo_url: Optional[str] = None  # Base64 encoded logo or file path
    
    # Invoice Details Settings
    invoice_details_font_size: float = 12.0
    invoice_details_alignment: str = "LEFT"
    invoice_details_spacing: float = 20.0  # mm
    
    # Billing Sections Settings
    billing_font_size: float = 11.0
    billing_line_height: float = 14.0
    billing_section_spacing: float = 20.0  # mm
    
    # Table Settings
    table_header_font_size: float = 11.0
    table_header_color: str = "#127285"
    table_header_text_color: str = "#FFFFFF"
    table_data_font_size: float = 10.0
    table_padding_horizontal: float = 6.0  # mm
    table_padding_vertical: float = 8.0  # mm
    
    # Column Widths (mm)
    col_item_width: float = 75.0
    col_gst_rate_width: float = 18.0
    col_quantity_width: float = 20.0
    col_rate_width: float = 22.0
    col_amount_width: float = 30.0
    col_igst_width: float = 25.0
    col_total_width: float = 30.0
    
    # Row Settings
    use_alternating_row_colors: bool = False
    alternating_row_color: str = "#F0F8FF"
    
    # Financial Summary Settings
    summary_font_size: float = 11.0
    total_row_color: str = "#127285"
    total_row_text_color: str = "#FFFFFF"
    
    # Signature Settings
    signature_font_size: float = 10.0
    signature_spacing: float = 30.0  # mm
    
    # Currency Settings
    currency_symbol: str = "₹"
    currency_format: str = "SYMBOL"  # SYMBOL, TEXT (₹ vs Rs.)
    
    # Company Information
    company_name: str = "Activus Industrial Design & Build"
    company_address: str = "Plot no. A-52, Sector no. 27, Phase - 2\nTaloja, Maharashtra, India - 410206"
    company_gst: str = "27ABCCS1234A1Z5"
    company_email: str = "info@activus.co.in"
    company_phone: str = "+91 99999 99999"
    
    # Custom Styling
    custom_css: Optional[str] = None
    
    # Canvas Elements for Canva-like functionality
    canvas_elements: Dict[str, CanvasElement] = {}
    
    # Metadata
    created_by: str = "system"
    created_at: datetime = datetime.now(timezone.utc)
    updated_at: datetime = datetime.now(timezone.utc)
    is_active: bool = True

class PDFTemplateManager:
    """Professional PDF Template Manager"""
    
    def __init__(self, db_collection=None):
        self.db = db_collection
        self.current_template = None
        
    async def get_active_template(self) -> PDFTemplateConfig:
        """Get the currently active PDF template"""
        try:
            if hasattr(self, 'db') and self.db is not None:
                template_data = await self.db.find_one({"is_active": True})
                if template_data is not None:
                    return PDFTemplateConfig(**template_data)
            
            # Return default template if none found
            return PDFTemplateConfig()
        except Exception as e:
            print(f"Error in get_active_template: {e}")
            # Return default template on error
            return PDFTemplateConfig()
    
    async def save_template(self, template: PDFTemplateConfig) -> bool:
        """Save PDF template configuration"""
        try:
            if hasattr(self, 'db') and self.db is not None:
                # Deactivate all other templates
                await self.db.update_many({}, {"$set": {"is_active": False}})
                
                # Save new active template
                template.updated_at = datetime.now(timezone.utc)
                template.is_active = True
                
                template_dict = template.dict()
                await self.db.replace_one(
                    {"id": template.id}, 
                    template_dict, 
                    upsert=True
                )
                
                self.current_template = template
                return True
            return False
        except Exception as e:
            print(f"Error saving template: {e}")
            return False
    
    async def get_template_by_id(self, template_id: str) -> Optional[PDFTemplateConfig]:
        """Get specific template by ID"""
        try:
            if hasattr(self, 'db') and self.db is not None:
                template_data = await self.db.find_one({"id": template_id})
                if template_data is not None:
                    return PDFTemplateConfig(**template_data)
            return None
        except Exception as e:
            print(f"Error in get_template_by_id: {e}")
            return None
    
    async def list_templates(self) -> list:
        """List all available templates"""
        try:
            if hasattr(self, 'db') and self.db is not None:
                templates = await self.db.find().to_list(length=None)
                return [PDFTemplateConfig(**t) for t in templates]
            return [PDFTemplateConfig()]  # Default template
        except Exception as e:
            print(f"Error in list_templates: {e}")
            return [PDFTemplateConfig()]  # Return default template on error
    
    def generate_column_widths(self, template: PDFTemplateConfig) -> list:
        """Generate column widths array from template config"""
        return [
            template.col_item_width,
            template.col_gst_rate_width, 
            template.col_quantity_width,
            template.col_rate_width,
            template.col_amount_width,
            template.col_igst_width,
            template.col_total_width
        ]
    
    def get_currency_symbol(self, template: PDFTemplateConfig) -> str:
        """Get currency symbol based on template config"""
        if template.currency_format == "SYMBOL":
            return template.currency_symbol
        elif template.currency_format == "TEXT":
            return "Rs."
        return "₹"  # Default
    
    def apply_template_to_invoice_data(self, template: PDFTemplateConfig, invoice_data: Dict[Any, Any]) -> Dict[Any, Any]:
        """Apply template formatting to invoice data"""
        currency_symbol = self.get_currency_symbol(template)
        
        # Apply currency formatting to invoice data
        if 'items' in invoice_data:
            for item in invoice_data['items']:
                if 'rate' in item:
                    item['rate_formatted'] = f"{currency_symbol}{item['rate']:,.2f}"
                if 'amount' in item:
                    item['amount_formatted'] = f"{currency_symbol}{item['amount']:,.2f}"
        
        return invoice_data

# Global template manager instance
template_manager = PDFTemplateManager()

async def initialize_template_manager(db):
    """Initialize the template manager with database connection"""
    global template_manager
    try:
        template_manager.db = db.pdf_templates
        
        # Ensure default template exists
        default_exists = await template_manager.db.find_one({"id": "default"})
        if default_exists is None:
            default_template = PDFTemplateConfig()
            await template_manager.save_template(default_template)
    except Exception as e:
        print(f"Error initializing template manager: {e}")
        # Continue without database connection - will use default template