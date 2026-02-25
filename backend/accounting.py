"""
ScrapOS ERP - Complete Double-Entry Accounting Module
Multi-tenant architecture with company_id isolation
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


# ==================== ENUMS ====================
class AccountType(str, Enum):
    ASSET = "asset"
    LIABILITY = "liability"
    EQUITY = "equity"
    INCOME = "income"
    COGS = "cogs"
    EXPENSE = "expense"


class PaymentMethod(str, Enum):
    CASH = "cash"
    BANK = "bank"
    CREDIT = "credit"


class FiscalPeriodStatus(str, Enum):
    OPEN = "open"
    CLOSED = "closed"
    LOCKED = "locked"


# ==================== CHART OF ACCOUNTS ====================
class ChartOfAccountBase(BaseModel):
    company_id: str
    account_code: str
    account_name: str
    account_type: AccountType
    parent_account_id: Optional[str] = None
    description: Optional[str] = None
    is_header: bool = False  # True for category headers
    is_active: bool = True
    normal_balance: str = "debit"  # debit or credit


class ChartOfAccount(ChartOfAccountBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    current_balance: float = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== JOURNAL ENTRIES ====================
class JournalEntryLineBase(BaseModel):
    account_id: str
    account_code: str
    account_name: str
    debit_amount: float = 0
    credit_amount: float = 0
    description: Optional[str] = None


class JournalEntryBase(BaseModel):
    company_id: str
    entry_date: str
    reference_type: str  # manual, expense, income, purchase, sale, adjustment
    reference_id: Optional[str] = None
    reference_number: Optional[str] = None
    description: str
    lines: List[JournalEntryLineBase] = []


class JournalEntryFull(JournalEntryBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    entry_number: str = ""
    total_debit: float = 0
    total_credit: float = 0
    is_posted: bool = False
    posted_at: Optional[datetime] = None
    posted_by: Optional[str] = None
    is_reversed: bool = False
    reversed_by_entry_id: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== EXPENSE ENTRY ====================
class ExpenseEntryBase(BaseModel):
    company_id: str
    expense_date: str
    expense_account_id: str
    expense_account_code: str
    expense_account_name: str
    amount: float
    payment_method: PaymentMethod
    payment_account_id: str  # Cash or Bank account
    payment_account_name: str
    reference_number: Optional[str] = None
    description: Optional[str] = None
    attachment_url: Optional[str] = None


class ExpenseEntry(ExpenseEntryBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    entry_number: str = ""
    journal_entry_id: Optional[str] = None
    status: str = "draft"  # draft, posted
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== INCOME ENTRY ====================
class IncomeEntryBase(BaseModel):
    company_id: str
    income_date: str
    income_account_id: str
    income_account_code: str
    income_account_name: str
    amount: float
    payment_method: PaymentMethod
    payment_account_id: str
    payment_account_name: str
    reference_number: Optional[str] = None
    description: Optional[str] = None


class IncomeEntry(IncomeEntryBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    entry_number: str = ""
    journal_entry_id: Optional[str] = None
    status: str = "draft"
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== ACCOUNT SETTINGS ====================
class AccountSettingsBase(BaseModel):
    company_id: str
    fiscal_year_start: str  # MM-DD format
    fiscal_year_end: str
    default_cash_account_id: Optional[str] = None
    default_bank_account_id: Optional[str] = None
    default_receivable_account_id: Optional[str] = None
    default_payable_account_id: Optional[str] = None
    default_sales_account_id: Optional[str] = None
    default_cogs_account_id: Optional[str] = None
    default_inventory_account_id: Optional[str] = None
    base_currency: str = "AED"
    current_fiscal_year: int = 2026
    period_lock_date: Optional[str] = None


class AccountSettings(AccountSettingsBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== DEFAULT CHART OF ACCOUNTS TEMPLATE ====================
DEFAULT_COA_TEMPLATE = [
    # ASSETS (1xxx)
    {"code": "1000", "name": "Assets", "type": "asset", "is_header": True, "normal_balance": "debit"},
    {"code": "1100", "name": "Current Assets", "type": "asset", "is_header": True, "parent": "1000", "normal_balance": "debit"},
    {"code": "1110", "name": "Cash on Hand", "type": "asset", "parent": "1100", "normal_balance": "debit"},
    {"code": "1120", "name": "Bank Account", "type": "asset", "parent": "1100", "normal_balance": "debit"},
    {"code": "1130", "name": "Petty Cash", "type": "asset", "parent": "1100", "normal_balance": "debit"},
    {"code": "1200", "name": "Accounts Receivable", "type": "asset", "parent": "1100", "normal_balance": "debit"},
    {"code": "1300", "name": "Inventory", "type": "asset", "parent": "1100", "normal_balance": "debit"},
    {"code": "1310", "name": "Scrap Inventory", "type": "asset", "parent": "1300", "normal_balance": "debit"},
    {"code": "1400", "name": "Prepaid Expenses", "type": "asset", "parent": "1100", "normal_balance": "debit"},
    {"code": "1500", "name": "Fixed Assets", "type": "asset", "is_header": True, "parent": "1000", "normal_balance": "debit"},
    {"code": "1510", "name": "Land", "type": "asset", "parent": "1500", "normal_balance": "debit"},
    {"code": "1520", "name": "Buildings", "type": "asset", "parent": "1500", "normal_balance": "debit"},
    {"code": "1530", "name": "Vehicles", "type": "asset", "parent": "1500", "normal_balance": "debit"},
    {"code": "1540", "name": "Equipment", "type": "asset", "parent": "1500", "normal_balance": "debit"},
    {"code": "1550", "name": "Accumulated Depreciation", "type": "asset", "parent": "1500", "normal_balance": "credit"},
    
    # LIABILITIES (2xxx)
    {"code": "2000", "name": "Liabilities", "type": "liability", "is_header": True, "normal_balance": "credit"},
    {"code": "2100", "name": "Current Liabilities", "type": "liability", "is_header": True, "parent": "2000", "normal_balance": "credit"},
    {"code": "2110", "name": "Accounts Payable", "type": "liability", "parent": "2100", "normal_balance": "credit"},
    {"code": "2120", "name": "VAT Payable", "type": "liability", "parent": "2100", "normal_balance": "credit"},
    {"code": "2130", "name": "Accrued Expenses", "type": "liability", "parent": "2100", "normal_balance": "credit"},
    {"code": "2140", "name": "Salaries Payable", "type": "liability", "parent": "2100", "normal_balance": "credit"},
    {"code": "2150", "name": "Broker Commission Payable", "type": "liability", "parent": "2100", "normal_balance": "credit"},
    {"code": "2200", "name": "Long-term Liabilities", "type": "liability", "is_header": True, "parent": "2000", "normal_balance": "credit"},
    {"code": "2210", "name": "Bank Loan", "type": "liability", "parent": "2200", "normal_balance": "credit"},
    
    # EQUITY (3xxx)
    {"code": "3000", "name": "Equity", "type": "equity", "is_header": True, "normal_balance": "credit"},
    {"code": "3100", "name": "Owner's Capital", "type": "equity", "parent": "3000", "normal_balance": "credit"},
    {"code": "3200", "name": "Retained Earnings", "type": "equity", "parent": "3000", "normal_balance": "credit"},
    {"code": "3300", "name": "Current Year Profit/Loss", "type": "equity", "parent": "3000", "normal_balance": "credit"},
    {"code": "3400", "name": "Dividends", "type": "equity", "parent": "3000", "normal_balance": "debit"},
    
    # INCOME (4xxx)
    {"code": "4000", "name": "Income", "type": "income", "is_header": True, "normal_balance": "credit"},
    {"code": "4100", "name": "Sales Revenue", "type": "income", "is_header": True, "parent": "4000", "normal_balance": "credit"},
    {"code": "4110", "name": "Local Sales", "type": "income", "parent": "4100", "normal_balance": "credit"},
    {"code": "4120", "name": "Export Sales", "type": "income", "parent": "4100", "normal_balance": "credit"},
    {"code": "4200", "name": "Other Income", "type": "income", "is_header": True, "parent": "4000", "normal_balance": "credit"},
    {"code": "4210", "name": "Interest Income", "type": "income", "parent": "4200", "normal_balance": "credit"},
    {"code": "4220", "name": "Foreign Exchange Gain", "type": "income", "parent": "4200", "normal_balance": "credit"},
    {"code": "4230", "name": "Miscellaneous Income", "type": "income", "parent": "4200", "normal_balance": "credit"},
    
    # COST OF GOODS SOLD (5xxx)
    {"code": "5000", "name": "Cost of Goods Sold", "type": "cogs", "is_header": True, "normal_balance": "debit"},
    {"code": "5100", "name": "Cost of Scrap Sold", "type": "cogs", "parent": "5000", "normal_balance": "debit"},
    {"code": "5110", "name": "Local Purchase Cost", "type": "cogs", "parent": "5100", "normal_balance": "debit"},
    {"code": "5120", "name": "Import Purchase Cost", "type": "cogs", "parent": "5100", "normal_balance": "debit"},
    {"code": "5200", "name": "Freight & Shipping", "type": "cogs", "parent": "5000", "normal_balance": "debit"},
    {"code": "5300", "name": "Customs & Duties", "type": "cogs", "parent": "5000", "normal_balance": "debit"},
    {"code": "5400", "name": "Insurance on Goods", "type": "cogs", "parent": "5000", "normal_balance": "debit"},
    
    # EXPENSES (6xxx)
    {"code": "6000", "name": "Operating Expenses", "type": "expense", "is_header": True, "normal_balance": "debit"},
    {"code": "6100", "name": "Salaries & Wages", "type": "expense", "is_header": True, "parent": "6000", "normal_balance": "debit"},
    {"code": "6110", "name": "Staff Salaries", "type": "expense", "parent": "6100", "normal_balance": "debit"},
    {"code": "6120", "name": "Management Salaries", "type": "expense", "parent": "6100", "normal_balance": "debit"},
    {"code": "6130", "name": "Employee Benefits", "type": "expense", "parent": "6100", "normal_balance": "debit"},
    {"code": "6200", "name": "Rent & Utilities", "type": "expense", "is_header": True, "parent": "6000", "normal_balance": "debit"},
    {"code": "6210", "name": "Office Rent", "type": "expense", "parent": "6200", "normal_balance": "debit"},
    {"code": "6220", "name": "Yard Rent", "type": "expense", "parent": "6200", "normal_balance": "debit"},
    {"code": "6230", "name": "Electricity", "type": "expense", "parent": "6200", "normal_balance": "debit"},
    {"code": "6240", "name": "Water", "type": "expense", "parent": "6200", "normal_balance": "debit"},
    {"code": "6250", "name": "Telephone & Internet", "type": "expense", "parent": "6200", "normal_balance": "debit"},
    {"code": "6300", "name": "Vehicle Expenses", "type": "expense", "is_header": True, "parent": "6000", "normal_balance": "debit"},
    {"code": "6310", "name": "Fuel & Oil", "type": "expense", "parent": "6300", "normal_balance": "debit"},
    {"code": "6320", "name": "Vehicle Maintenance", "type": "expense", "parent": "6300", "normal_balance": "debit"},
    {"code": "6330", "name": "Vehicle Insurance", "type": "expense", "parent": "6300", "normal_balance": "debit"},
    {"code": "6400", "name": "Office Expenses", "type": "expense", "is_header": True, "parent": "6000", "normal_balance": "debit"},
    {"code": "6410", "name": "Office Supplies", "type": "expense", "parent": "6400", "normal_balance": "debit"},
    {"code": "6420", "name": "Printing & Stationery", "type": "expense", "parent": "6400", "normal_balance": "debit"},
    {"code": "6500", "name": "Professional Fees", "type": "expense", "is_header": True, "parent": "6000", "normal_balance": "debit"},
    {"code": "6510", "name": "Legal Fees", "type": "expense", "parent": "6500", "normal_balance": "debit"},
    {"code": "6520", "name": "Audit Fees", "type": "expense", "parent": "6500", "normal_balance": "debit"},
    {"code": "6530", "name": "Consulting Fees", "type": "expense", "parent": "6500", "normal_balance": "debit"},
    {"code": "6600", "name": "Bank Charges", "type": "expense", "parent": "6000", "normal_balance": "debit"},
    {"code": "6700", "name": "Depreciation Expense", "type": "expense", "parent": "6000", "normal_balance": "debit"},
    {"code": "6800", "name": "Insurance Expense", "type": "expense", "parent": "6000", "normal_balance": "debit"},
    {"code": "6900", "name": "Broker Commissions", "type": "expense", "parent": "6000", "normal_balance": "debit"},
    {"code": "6950", "name": "Foreign Exchange Loss", "type": "expense", "parent": "6000", "normal_balance": "debit"},
    {"code": "6999", "name": "Miscellaneous Expenses", "type": "expense", "parent": "6000", "normal_balance": "debit"},
]


def get_normal_balance(account_type: str) -> str:
    """Get normal balance for account type"""
    if account_type in ["asset", "expense", "cogs"]:
        return "debit"
    else:
        return "credit"
