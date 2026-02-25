from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from decimal import Decimal
from enum import Enum
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env', override=False)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'scrapos_secret_key_change_in_production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

app = FastAPI(title="ScrapOS ERP API", version="1.0.0")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# APScheduler for scheduled backups
scheduler = AsyncIOScheduler()
BACKUP_DIR = Path(__file__).parent / "backups"
BACKUP_DIR.mkdir(exist_ok=True)

# ==================== ENUMS ====================
class UserRole(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    ACCOUNTANT = "accountant"
    WEIGHBRIDGE_OPERATOR = "weighbridge_operator"
    SALES = "sales"
    PURCHASE = "purchase"
    VIEWER = "viewer"

class TransactionType(str, Enum):
    LOCAL = "local"
    INTERNATIONAL = "international"

class DocumentStatus(str, Enum):
    DRAFT = "draft"
    PENDING = "pending"
    APPROVED = "approved"
    POSTED = "posted"
    CANCELLED = "cancelled"

class WeighbridgeStatus(str, Enum):
    FIRST_WEIGHT = "first_weight"
    SECOND_WEIGHT = "second_weight"
    COMPLETED = "completed"

class BrokerCommissionType(str, Enum):
    PER_MT = "per_mt"
    PERCENTAGE = "percentage"

# ==================== AUTH MODELS ====================
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.VIEWER
    company_id: Optional[str] = None
    branch_id: Optional[str] = None
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

# ==================== MASTER DATA MODELS ====================
class CompanyBase(BaseModel):
    name: str
    code: str
    address: Optional[str] = None
    country: str = "UAE"
    currency: str = "AED"
    vat_number: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    slogan: Optional[str] = None
    logo: Optional[str] = None  # Base64 encoded image
    is_active: bool = True

class Company(CompanyBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BranchBase(BaseModel):
    name: str
    code: str
    company_id: str
    address: Optional[str] = None
    city: Optional[str] = None
    country: str = "UAE"
    is_yard: bool = True
    is_active: bool = True

class Branch(BranchBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomerBase(BaseModel):
    name: str
    code: str
    type: TransactionType = TransactionType.LOCAL
    company_id: str
    address: Optional[str] = None
    city: Optional[str] = None
    country: str = "UAE"
    vat_number: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    currency: str = "AED"
    payment_terms_id: Optional[str] = None
    credit_limit: float = 0
    is_active: bool = True

class Customer(CustomerBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SupplierBase(BaseModel):
    name: str
    code: str
    type: TransactionType = TransactionType.LOCAL
    company_id: str
    address: Optional[str] = None
    city: Optional[str] = None
    country: str = "UAE"
    vat_number: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    currency: str = "AED"
    payment_terms_id: Optional[str] = None
    is_active: bool = True

class Supplier(SupplierBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BrokerBase(BaseModel):
    name: str
    code: str
    company_id: str
    commission_type: BrokerCommissionType = BrokerCommissionType.PER_MT
    commission_rate: float = 0
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: bool = True

class Broker(BrokerBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ScrapCategoryBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    is_active: bool = True

class ScrapCategory(ScrapCategoryBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ScrapItemBase(BaseModel):
    name: str
    code: str
    category_id: str
    grade: Optional[str] = None
    type: Optional[str] = None
    density: Optional[float] = None
    unit: str = "MT"
    default_vat_code_id: Optional[str] = None
    min_stock: float = 0
    is_active: bool = True

class ScrapItem(ScrapItemBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class VATCodeBase(BaseModel):
    name: str
    code: str
    rate: float
    description: Optional[str] = None
    is_default: bool = False
    is_active: bool = True

class VATCode(VATCodeBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CurrencyBase(BaseModel):
    name: str
    code: str
    symbol: str
    exchange_rate: float = 1.0
    is_base: bool = False
    is_active: bool = True

class Currency(CurrencyBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentTermBase(BaseModel):
    name: str
    code: str
    days: int = 0
    description: Optional[str] = None
    is_active: bool = True

class PaymentTerm(PaymentTermBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

class IncotermBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    is_active: bool = True

class Incoterm(IncotermBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

class PortBase(BaseModel):
    name: str
    code: str
    country: str
    city: Optional[str] = None
    is_active: bool = True

class Port(PortBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

class WeighbridgeBase(BaseModel):
    name: str
    code: str
    branch_id: str
    max_capacity: float = 100
    unit: str = "MT"
    is_active: bool = True

class Weighbridge(WeighbridgeBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== WEIGHBRIDGE ENTRY MODELS ====================
class WeighbridgeEntryBase(BaseModel):
    weighbridge_id: str
    branch_id: str
    vehicle_number: str
    driver_name: Optional[str] = None
    transaction_type: str  # purchase or sales
    reference_type: Optional[str] = None  # local_purchase, intl_purchase, local_sales, export_sales
    reference_id: Optional[str] = None
    gross_weight: Optional[float] = None
    tare_weight: Optional[float] = None
    net_weight: Optional[float] = None
    status: WeighbridgeStatus = WeighbridgeStatus.FIRST_WEIGHT
    notes: Optional[str] = None

class WeighbridgeEntry(WeighbridgeEntryBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    slip_number: str = ""
    first_weight_time: Optional[datetime] = None
    second_weight_time: Optional[datetime] = None
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_locked: bool = False

# ==================== PURCHASE MODELS ====================
class PurchaseOrderLineBase(BaseModel):
    item_id: str
    item_name: str
    quantity: float
    unit: str = "MT"
    unit_price: float
    vat_code_id: Optional[str] = None
    vat_rate: float = 0
    vat_amount: float = 0
    line_total: float = 0

class LocalPurchaseOrderBase(BaseModel):
    company_id: str
    branch_id: str
    supplier_id: str
    supplier_name: str
    order_date: str
    expected_date: Optional[str] = None
    broker_id: Optional[str] = None
    broker_commission_type: Optional[BrokerCommissionType] = None
    broker_commission_rate: float = 0
    currency: str = "AED"
    subtotal: float = 0
    vat_amount: float = 0
    total_amount: float = 0
    broker_commission: float = 0
    notes: Optional[str] = None
    status: DocumentStatus = DocumentStatus.DRAFT
    lines: List[PurchaseOrderLineBase] = []

class LocalPurchaseOrder(LocalPurchaseOrderBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str = ""
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    posted_at: Optional[datetime] = None
    posted_by: Optional[str] = None
    cancellation_reason: Optional[str] = None
    cancelled_by: Optional[str] = None
    cancelled_at: Optional[datetime] = None
    edit_history: List[Dict] = []  # Track edits after posting

class IntlPurchaseOrderBase(BaseModel):
    company_id: str
    branch_id: str
    supplier_id: str
    supplier_name: str
    order_date: str
    expected_date: Optional[str] = None
    currency: str = "USD"
    exchange_rate: float = 1.0
    incoterm_id: Optional[str] = None
    port_of_loading_id: Optional[str] = None
    port_of_destination_id: Optional[str] = None
    shipping_line: Optional[str] = None
    container_number: Optional[str] = None
    bl_number: Optional[str] = None
    subtotal: float = 0
    freight_cost: float = 0
    insurance_cost: float = 0
    customs_duty: float = 0
    other_costs: float = 0
    landed_cost: float = 0
    total_amount: float = 0
    notes: Optional[str] = None
    status: DocumentStatus = DocumentStatus.DRAFT
    lines: List[PurchaseOrderLineBase] = []

class IntlPurchaseOrder(IntlPurchaseOrderBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str = ""
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    posted_at: Optional[datetime] = None

# ==================== SALES MODELS ====================
class SalesOrderLineBase(BaseModel):
    item_id: str
    item_name: str
    quantity: float
    unit: str = "MT"
    unit_price: float
    vat_code_id: Optional[str] = None
    vat_rate: float = 0
    vat_amount: float = 0
    line_total: float = 0

class LocalSalesOrderBase(BaseModel):
    company_id: str
    branch_id: str
    customer_id: str
    customer_name: str
    order_date: str
    delivery_date: Optional[str] = None
    broker_id: Optional[str] = None
    broker_commission_type: Optional[BrokerCommissionType] = None
    broker_commission_rate: float = 0
    currency: str = "AED"
    subtotal: float = 0
    vat_amount: float = 0
    total_amount: float = 0
    broker_commission: float = 0
    notes: Optional[str] = None
    status: DocumentStatus = DocumentStatus.DRAFT
    lines: List[SalesOrderLineBase] = []

class LocalSalesOrder(LocalSalesOrderBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str = ""
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    posted_at: Optional[datetime] = None

class ExportSalesContractBase(BaseModel):
    company_id: str
    branch_id: str
    customer_id: str
    customer_name: str
    contract_date: str
    shipment_date: Optional[str] = None
    currency: str = "USD"
    exchange_rate: float = 1.0
    incoterm_id: Optional[str] = None
    port_of_loading_id: Optional[str] = None
    port_of_destination_id: Optional[str] = None
    shipping_line: Optional[str] = None
    container_number: Optional[str] = None
    bl_number: Optional[str] = None
    subtotal: float = 0
    freight_cost: float = 0
    total_amount: float = 0
    notes: Optional[str] = None
    status: DocumentStatus = DocumentStatus.DRAFT
    lines: List[SalesOrderLineBase] = []

class ExportSalesContract(ExportSalesContractBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    contract_number: str = ""
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    posted_at: Optional[datetime] = None

# ==================== INVENTORY MODELS ====================
class InventoryStock(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    item_id: str
    item_name: str
    branch_id: str
    branch_name: str
    quantity: float = 0
    unit: str = "MT"
    avg_cost: float = 0
    total_value: float = 0
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InventoryMovement(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    item_id: str
    branch_id: str
    movement_type: str  # IN, OUT, ADJUST
    reference_type: str
    reference_id: str
    reference_number: str
    quantity: float
    unit_cost: float
    total_cost: float
    balance_qty: float
    balance_value: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== ACCOUNTING MODELS ====================
class AccountBase(BaseModel):
    code: str
    name: str
    account_type: str  # asset, liability, equity, income, expense
    parent_id: Optional[str] = None
    is_active: bool = True

class Account(AccountBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    balance: float = 0

class JournalEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    entry_number: str = ""
    entry_date: str
    reference_type: str
    reference_id: str
    reference_number: str
    description: str
    lines: List[Dict[str, Any]] = []
    total_debit: float = 0
    total_credit: float = 0
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== AUDIT LOG ====================
class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_email: str
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== HELPER FUNCTIONS ====================
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def generate_number(prefix: str, collection: str, field: str = "order_number") -> str:
    today = datetime.now(timezone.utc)
    year_month = today.strftime("%Y%m")
    pattern = f"^{prefix}-{year_month}-"
    count = await db[collection].count_documents({field: {"$regex": pattern}})
    return f"{prefix}-{year_month}-{str(count + 1).zfill(4)}"

async def log_audit(user_id: str, user_email: str, action: str, entity_type: str, entity_id: str, 
                   old_values: Dict = None, new_values: Dict = None):
    audit = AuditLog(
        user_id=user_id,
        user_email=user_email,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        old_values=old_values,
        new_values=new_values
    )
    doc = audit.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.audit_logs.insert_one(doc)

# ==================== AUTH ROUTES ====================
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(**user_data.model_dump(exclude={"password"}))
    doc = user.model_dump()
    doc['password_hash'] = hash_password(user_data.password)
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.users.insert_one(doc)
    
    token = create_token(user.id, user.email, user.role)
    user_dict = {k: v for k, v in doc.items() if k not in ['_id', 'password_hash']}
    return Token(access_token=token, user=user_dict)

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user.get('password_hash', '')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get('is_active', True):
        raise HTTPException(status_code=401, detail="Account is inactive")
    
    token = create_token(user['id'], user['email'], user['role'])
    user_dict = {k: v for k, v in user.items() if k != 'password_hash'}
    return Token(access_token=token, user=user_dict)

@api_router.get("/auth/me")
async def get_me(current_user: Dict = Depends(get_current_user)):
    return current_user

@api_router.put("/auth/change-password")
async def change_password(data: PasswordChange, current_user: Dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user['id']}, {"_id": 0})
    if not verify_password(data.current_password, user.get('password_hash', '')):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    new_hash = hash_password(data.new_password)
    await db.users.update_one({"id": current_user['id']}, {"$set": {"password_hash": new_hash}})
    return {"message": "Password changed successfully"}

# ==================== USERS MANAGEMENT ====================
@api_router.get("/users", response_model=List[Dict])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: Dict = Depends(get_current_user)
):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).skip(skip).limit(limit).to_list(limit)
    return users

@api_router.post("/users", response_model=Dict)
async def create_user(user_data: UserCreate, current_user: Dict = Depends(get_current_user)):
    if current_user['role'] not in ['admin', 'manager']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    user = User(**user_data.model_dump(exclude={"password"}))
    doc = user.model_dump()
    doc['password_hash'] = hash_password(user_data.password)
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.users.insert_one(doc)
    await log_audit(current_user['id'], current_user['email'], 'CREATE', 'user', user.id, new_values={"email": user.email})
    
    return {k: v for k, v in doc.items() if k not in ['_id', 'password_hash']}

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, user_data: Dict, current_user: Dict = Depends(get_current_user)):
    if current_user['role'] not in ['admin', 'manager']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    user_data.pop('password', None)
    user_data.pop('password_hash', None)
    user_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.users.update_one({"id": user_id}, {"$set": user_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    await log_audit(current_user['id'], current_user['email'], 'UPDATE', 'user', user_id, new_values=user_data)
    return {"message": "User updated"}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: Dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.users.update_one({"id": user_id}, {"$set": {"is_active": False}})
    await log_audit(current_user['id'], current_user['email'], 'DELETE', 'user', user_id)
    return {"message": "User deactivated"}

@api_router.delete("/users/{user_id}/permanent")
async def delete_user_permanent(user_id: str, current_user: Dict = Depends(get_current_user)):
    """Permanently delete a user (admin only)"""
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Prevent admin from deleting themselves
    if user_id == current_user['id']:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.delete_one({"id": user_id})
    await log_audit(current_user['id'], current_user['email'], 'PERMANENT_DELETE', 'user', user_id, old_values=user)
    return {"message": "User permanently deleted"}

@api_router.put("/users/{user_id}/reset-password")
async def admin_reset_password(user_id: str, data: Dict, current_user: Dict = Depends(get_current_user)):
    """Admin can reset any user's password"""
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    
    new_password = data.get('new_password')
    if not new_password or len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_hash = hash_password(new_password)
    await db.users.update_one({"id": user_id}, {"$set": {"password_hash": new_hash}})
    await log_audit(current_user['id'], current_user['email'], 'RESET_PASSWORD', 'user', user_id)
    return {"message": "Password reset successfully"}

# ==================== GENERIC CRUD HELPER ====================
async def crud_list(collection: str, filters: Dict = None, limit: int = 500):
    query = filters or {}
    items = await db[collection].find(query, {"_id": 0}).limit(limit).to_list(limit)
    return items

async def crud_get(collection: str, item_id: str):
    item = await db[collection].find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

async def crud_create(collection: str, item: BaseModel, current_user: Dict):
    doc = item.model_dump()
    if 'created_at' in doc and hasattr(doc['created_at'], 'isoformat'):
        doc['created_at'] = doc['created_at'].isoformat()
    if 'updated_at' in doc and hasattr(doc['updated_at'], 'isoformat'):
        doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db[collection].insert_one(doc)
    await log_audit(current_user['id'], current_user['email'], 'CREATE', collection, doc['id'])
    return {k: v for k, v in doc.items() if k != '_id'}

async def crud_update(collection: str, item_id: str, data: Dict, current_user: Dict):
    data.pop('id', None)
    data.pop('_id', None)
    data.pop('created_at', None)
    
    result = await db[collection].update_one({"id": item_id}, {"$set": data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    
    await log_audit(current_user['id'], current_user['email'], 'UPDATE', collection, item_id, new_values=data)
    return {"message": "Updated successfully"}

async def crud_delete(collection: str, item_id: str, current_user: Dict):
    await db[collection].update_one({"id": item_id}, {"$set": {"is_active": False}})
    await log_audit(current_user['id'], current_user['email'], 'DELETE', collection, item_id)
    return {"message": "Deactivated successfully"}

# ==================== COMPANIES ====================
@api_router.get("/companies", response_model=List[Dict])
async def list_companies(current_user: Dict = Depends(get_current_user)):
    return await crud_list("companies")

@api_router.get("/companies/{company_id}")
async def get_company(company_id: str, current_user: Dict = Depends(get_current_user)):
    return await crud_get("companies", company_id)

@api_router.post("/companies")
async def create_company(data: CompanyBase, current_user: Dict = Depends(get_current_user)):
    company = Company(**data.model_dump())
    return await crud_create("companies", company, current_user)

@api_router.put("/companies/{company_id}")
async def update_company(company_id: str, data: Dict, current_user: Dict = Depends(get_current_user)):
    return await crud_update("companies", company_id, data, current_user)

@api_router.delete("/companies/{company_id}")
async def delete_company(company_id: str, current_user: Dict = Depends(get_current_user)):
    return await crud_delete("companies", company_id, current_user)

# ==================== BRANCHES ====================
@api_router.get("/branches", response_model=List[Dict])
async def list_branches(company_id: Optional[str] = None, current_user: Dict = Depends(get_current_user)):
    filters = {"company_id": company_id} if company_id else {}
    return await crud_list("branches", filters)

@api_router.get("/branches/{branch_id}")
async def get_branch(branch_id: str, current_user: Dict = Depends(get_current_user)):
    return await crud_get("branches", branch_id)

@api_router.post("/branches")
async def create_branch(data: BranchBase, current_user: Dict = Depends(get_current_user)):
    branch = Branch(**data.model_dump())
    return await crud_create("branches", branch, current_user)

@api_router.put("/branches/{branch_id}")
async def update_branch(branch_id: str, data: Dict, current_user: Dict = Depends(get_current_user)):
    return await crud_update("branches", branch_id, data, current_user)

@api_router.delete("/branches/{branch_id}")
async def delete_branch(branch_id: str, current_user: Dict = Depends(get_current_user)):
    return await crud_delete("branches", branch_id, current_user)

# ==================== CUSTOMERS ====================
@api_router.get("/customers", response_model=List[Dict])
async def list_customers(type: Optional[str] = None, current_user: Dict = Depends(get_current_user)):
    filters = {"type": type} if type else {}
    return await crud_list("customers", filters)

@api_router.get("/customers/{customer_id}")
async def get_customer(customer_id: str, current_user: Dict = Depends(get_current_user)):
    return await crud_get("customers", customer_id)

@api_router.post("/customers")
async def create_customer(data: CustomerBase, current_user: Dict = Depends(get_current_user)):
    customer = Customer(**data.model_dump())
    return await crud_create("customers", customer, current_user)

@api_router.put("/customers/{customer_id}")
async def update_customer(customer_id: str, data: Dict, current_user: Dict = Depends(get_current_user)):
    return await crud_update("customers", customer_id, data, current_user)

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, current_user: Dict = Depends(get_current_user)):
    return await crud_delete("customers", customer_id, current_user)

# ==================== SUPPLIERS ====================
@api_router.get("/suppliers", response_model=List[Dict])
async def list_suppliers(type: Optional[str] = None, current_user: Dict = Depends(get_current_user)):
    filters = {"type": type} if type else {}
    return await crud_list("suppliers", filters)

@api_router.get("/suppliers/{supplier_id}")
async def get_supplier(supplier_id: str, current_user: Dict = Depends(get_current_user)):
    return await crud_get("suppliers", supplier_id)

@api_router.post("/suppliers")
async def create_supplier(data: SupplierBase, current_user: Dict = Depends(get_current_user)):
    supplier = Supplier(**data.model_dump())
    return await crud_create("suppliers", supplier, current_user)

@api_router.put("/suppliers/{supplier_id}")
async def update_supplier(supplier_id: str, data: Dict, current_user: Dict = Depends(get_current_user)):
    return await crud_update("suppliers", supplier_id, data, current_user)

@api_router.delete("/suppliers/{supplier_id}")
async def delete_supplier(supplier_id: str, current_user: Dict = Depends(get_current_user)):
    return await crud_delete("suppliers", supplier_id, current_user)

# ==================== BROKERS ====================
@api_router.get("/brokers", response_model=List[Dict])
async def list_brokers(current_user: Dict = Depends(get_current_user)):
    return await crud_list("brokers")

@api_router.get("/brokers/{broker_id}")
async def get_broker(broker_id: str, current_user: Dict = Depends(get_current_user)):
    return await crud_get("brokers", broker_id)

@api_router.post("/brokers")
async def create_broker(data: BrokerBase, current_user: Dict = Depends(get_current_user)):
    broker = Broker(**data.model_dump())
    return await crud_create("brokers", broker, current_user)

@api_router.put("/brokers/{broker_id}")
async def update_broker(broker_id: str, data: Dict, current_user: Dict = Depends(get_current_user)):
    return await crud_update("brokers", broker_id, data, current_user)

@api_router.delete("/brokers/{broker_id}")
async def delete_broker(broker_id: str, current_user: Dict = Depends(get_current_user)):
    return await crud_delete("brokers", broker_id, current_user)

# ==================== SCRAP CATEGORIES ====================
@api_router.get("/scrap-categories", response_model=List[Dict])
async def list_scrap_categories(current_user: Dict = Depends(get_current_user)):
    return await crud_list("scrap_categories")

@api_router.post("/scrap-categories")
async def create_scrap_category(data: ScrapCategoryBase, current_user: Dict = Depends(get_current_user)):
    category = ScrapCategory(**data.model_dump())
    return await crud_create("scrap_categories", category, current_user)

@api_router.put("/scrap-categories/{category_id}")
async def update_scrap_category(category_id: str, data: Dict, current_user: Dict = Depends(get_current_user)):
    return await crud_update("scrap_categories", category_id, data, current_user)

@api_router.delete("/scrap-categories/{category_id}")
async def delete_scrap_category(category_id: str, current_user: Dict = Depends(get_current_user)):
    return await crud_delete("scrap_categories", category_id, current_user)

# ==================== SCRAP ITEMS ====================
@api_router.get("/scrap-items", response_model=List[Dict])
async def list_scrap_items(category_id: Optional[str] = None, current_user: Dict = Depends(get_current_user)):
    filters = {"category_id": category_id} if category_id else {}
    return await crud_list("scrap_items", filters)

@api_router.get("/scrap-items/{item_id}")
async def get_scrap_item(item_id: str, current_user: Dict = Depends(get_current_user)):
    return await crud_get("scrap_items", item_id)

@api_router.post("/scrap-items")
async def create_scrap_item(data: ScrapItemBase, current_user: Dict = Depends(get_current_user)):
    item = ScrapItem(**data.model_dump())
    return await crud_create("scrap_items", item, current_user)

@api_router.put("/scrap-items/{item_id}")
async def update_scrap_item(item_id: str, data: Dict, current_user: Dict = Depends(get_current_user)):
    return await crud_update("scrap_items", item_id, data, current_user)

@api_router.delete("/scrap-items/{item_id}")
async def delete_scrap_item(item_id: str, current_user: Dict = Depends(get_current_user)):
    return await crud_delete("scrap_items", item_id, current_user)

# ==================== VAT CODES ====================
@api_router.get("/vat-codes", response_model=List[Dict])
async def list_vat_codes(current_user: Dict = Depends(get_current_user)):
    return await crud_list("vat_codes")

@api_router.post("/vat-codes")
async def create_vat_code(data: VATCodeBase, current_user: Dict = Depends(get_current_user)):
    vat = VATCode(**data.model_dump())
    return await crud_create("vat_codes", vat, current_user)

@api_router.put("/vat-codes/{vat_id}")
async def update_vat_code(vat_id: str, data: Dict, current_user: Dict = Depends(get_current_user)):
    return await crud_update("vat_codes", vat_id, data, current_user)

@api_router.delete("/vat-codes/{vat_id}")
async def delete_vat_code(vat_id: str, current_user: Dict = Depends(get_current_user)):
    return await crud_delete("vat_codes", vat_id, current_user)

# ==================== CURRENCIES ====================
@api_router.get("/currencies", response_model=List[Dict])
async def list_currencies(current_user: Dict = Depends(get_current_user)):
    return await crud_list("currencies")

@api_router.post("/currencies")
async def create_currency(data: CurrencyBase, current_user: Dict = Depends(get_current_user)):
    currency = Currency(**data.model_dump())
    return await crud_create("currencies", currency, current_user)

@api_router.put("/currencies/{currency_id}")
async def update_currency(currency_id: str, data: Dict, current_user: Dict = Depends(get_current_user)):
    return await crud_update("currencies", currency_id, data, current_user)

# ==================== PAYMENT TERMS ====================
@api_router.get("/payment-terms", response_model=List[Dict])
async def list_payment_terms(current_user: Dict = Depends(get_current_user)):
    return await crud_list("payment_terms")

@api_router.post("/payment-terms")
async def create_payment_term(data: PaymentTermBase, current_user: Dict = Depends(get_current_user)):
    term = PaymentTerm(**data.model_dump())
    return await crud_create("payment_terms", term, current_user)

@api_router.put("/payment-terms/{term_id}")
async def update_payment_term(term_id: str, data: Dict, current_user: Dict = Depends(get_current_user)):
    return await crud_update("payment_terms", term_id, data, current_user)

# ==================== INCOTERMS ====================
@api_router.get("/incoterms", response_model=List[Dict])
async def list_incoterms(current_user: Dict = Depends(get_current_user)):
    return await crud_list("incoterms")

@api_router.post("/incoterms")
async def create_incoterm(data: IncotermBase, current_user: Dict = Depends(get_current_user)):
    incoterm = Incoterm(**data.model_dump())
    return await crud_create("incoterms", incoterm, current_user)

@api_router.put("/incoterms/{incoterm_id}")
async def update_incoterm(incoterm_id: str, data: Dict, current_user: Dict = Depends(get_current_user)):
    return await crud_update("incoterms", incoterm_id, data, current_user)

# ==================== PORTS ====================
@api_router.get("/ports", response_model=List[Dict])
async def list_ports(current_user: Dict = Depends(get_current_user)):
    return await crud_list("ports")

@api_router.post("/ports")
async def create_port(data: PortBase, current_user: Dict = Depends(get_current_user)):
    port = Port(**data.model_dump())
    return await crud_create("ports", port, current_user)

@api_router.put("/ports/{port_id}")
async def update_port(port_id: str, data: Dict, current_user: Dict = Depends(get_current_user)):
    return await crud_update("ports", port_id, data, current_user)

# ==================== WEIGHBRIDGES ====================
@api_router.get("/weighbridges", response_model=List[Dict])
async def list_weighbridges(branch_id: Optional[str] = None, current_user: Dict = Depends(get_current_user)):
    filters = {"branch_id": branch_id} if branch_id else {}
    return await crud_list("weighbridges", filters)

@api_router.post("/weighbridges")
async def create_weighbridge(data: WeighbridgeBase, current_user: Dict = Depends(get_current_user)):
    wb = Weighbridge(**data.model_dump())
    return await crud_create("weighbridges", wb, current_user)

@api_router.put("/weighbridges/{wb_id}")
async def update_weighbridge(wb_id: str, data: Dict, current_user: Dict = Depends(get_current_user)):
    return await crud_update("weighbridges", wb_id, data, current_user)

# ==================== WEIGHBRIDGE ENTRIES ====================
@api_router.get("/weighbridge-entries", response_model=List[Dict])
async def list_weighbridge_entries(
    status: Optional[str] = None,
    branch_id: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    filters = {}
    if status:
        filters['status'] = status
    if branch_id:
        filters['branch_id'] = branch_id
    return await crud_list("weighbridge_entries", filters)

@api_router.get("/weighbridge-entries/{entry_id}")
async def get_weighbridge_entry(entry_id: str, current_user: Dict = Depends(get_current_user)):
    return await crud_get("weighbridge_entries", entry_id)

@api_router.post("/weighbridge-entries")
async def create_weighbridge_entry(data: WeighbridgeEntryBase, current_user: Dict = Depends(get_current_user)):
    entry = WeighbridgeEntry(**data.model_dump())
    entry.slip_number = await generate_number("WB", "weighbridge_entries", "slip_number")
    entry.created_by = current_user['id']
    
    if entry.gross_weight:
        entry.first_weight_time = datetime.now(timezone.utc)
    
    doc = entry.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('first_weight_time'):
        doc['first_weight_time'] = doc['first_weight_time'].isoformat()
    
    await db.weighbridge_entries.insert_one(doc)
    await log_audit(current_user['id'], current_user['email'], 'CREATE', 'weighbridge_entry', entry.id)
    return {k: v for k, v in doc.items() if k != '_id'}

@api_router.put("/weighbridge-entries/{entry_id}/second-weight")
async def record_second_weight(entry_id: str, tare_weight: float, current_user: Dict = Depends(get_current_user)):
    entry = await db.weighbridge_entries.find_one({"id": entry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    if entry.get('is_locked'):
        raise HTTPException(status_code=400, detail="Entry is locked")
    
    gross_weight = entry.get('gross_weight', 0)
    net_weight = gross_weight - tare_weight
    
    update_data = {
        "tare_weight": tare_weight,
        "net_weight": net_weight,
        "status": "completed",
        "second_weight_time": datetime.now(timezone.utc).isoformat()
    }
    
    await db.weighbridge_entries.update_one({"id": entry_id}, {"$set": update_data})
    await log_audit(current_user['id'], current_user['email'], 'UPDATE', 'weighbridge_entry', entry_id, new_values=update_data)
    
    return {"message": "Second weight recorded", "net_weight": net_weight}

@api_router.put("/weighbridge-entries/{entry_id}/lock")
async def lock_weighbridge_entry(entry_id: str, current_user: Dict = Depends(get_current_user)):
    await db.weighbridge_entries.update_one({"id": entry_id}, {"$set": {"is_locked": True}})
    return {"message": "Entry locked"}

# ==================== LOCAL PURCHASES ====================
@api_router.get("/local-purchases", response_model=List[Dict])
async def list_local_purchases(
    status: Optional[str] = None,
    supplier_id: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    filters = {}
    if status:
        filters['status'] = status
    if supplier_id:
        filters['supplier_id'] = supplier_id
    return await crud_list("local_purchases", filters)

@api_router.get("/local-purchases/{po_id}")
async def get_local_purchase(po_id: str, current_user: Dict = Depends(get_current_user)):
    return await crud_get("local_purchases", po_id)

@api_router.post("/local-purchases")
async def create_local_purchase(data: LocalPurchaseOrderBase, current_user: Dict = Depends(get_current_user)):
    po = LocalPurchaseOrder(**data.model_dump())
    po.order_number = await generate_number("LPO", "local_purchases")
    po.created_by = current_user['id']
    
    # Calculate totals
    subtotal = sum(line.quantity * line.unit_price for line in data.lines)
    vat_amount = sum(line.vat_amount for line in data.lines)
    
    po.subtotal = subtotal
    po.vat_amount = vat_amount
    po.total_amount = subtotal + vat_amount
    
    # Calculate broker commission
    if data.broker_id and data.broker_commission_rate > 0:
        total_qty = sum(line.quantity for line in data.lines)
        if data.broker_commission_type == BrokerCommissionType.PER_MT:
            po.broker_commission = total_qty * data.broker_commission_rate
        else:
            po.broker_commission = subtotal * (data.broker_commission_rate / 100)
    
    doc = po.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['lines'] = [line.model_dump() for line in data.lines]
    
    await db.local_purchases.insert_one(doc)
    await log_audit(current_user['id'], current_user['email'], 'CREATE', 'local_purchase', po.id)
    return {k: v for k, v in doc.items() if k != '_id'}

@api_router.put("/local-purchases/{po_id}")
async def update_local_purchase(po_id: str, data: Dict, current_user: Dict = Depends(get_current_user)):
    existing = await db.local_purchases.find_one({"id": po_id}, {"_id": 0})
    if existing and existing.get('status') == 'posted':
        raise HTTPException(status_code=400, detail="Cannot edit posted document")
    return await crud_update("local_purchases", po_id, data, current_user)

@api_router.post("/local-purchases/{po_id}/post")
async def post_local_purchase(po_id: str, current_user: Dict = Depends(get_current_user)):
    po = await db.local_purchases.find_one({"id": po_id}, {"_id": 0})
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    if po.get('status') == 'posted':
        raise HTTPException(status_code=400, detail="Already posted")
    
    # Update inventory
    for line in po.get('lines', []):
        await update_inventory(
            item_id=line['item_id'],
            item_name=line['item_name'],
            branch_id=po['branch_id'],
            quantity=line['quantity'],
            unit_cost=line['unit_price'],
            movement_type='IN',
            reference_type='local_purchase',
            reference_id=po_id,
            reference_number=po['order_number']
        )
    
    # Create journal entry
    await create_purchase_journal_entry(po, 'local')
    
    # Update status
    await db.local_purchases.update_one(
        {"id": po_id},
        {"$set": {"status": "posted", "posted_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await log_audit(current_user['id'], current_user['email'], 'POST', 'local_purchase', po_id)
    return {"message": "Purchase order posted"}

# ==================== INTERNATIONAL PURCHASES ====================
@api_router.get("/intl-purchases", response_model=List[Dict])
async def list_intl_purchases(
    status: Optional[str] = None,
    supplier_id: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    filters = {}
    if status:
        filters['status'] = status
    if supplier_id:
        filters['supplier_id'] = supplier_id
    return await crud_list("intl_purchases", filters)

@api_router.get("/intl-purchases/{po_id}")
async def get_intl_purchase(po_id: str, current_user: Dict = Depends(get_current_user)):
    return await crud_get("intl_purchases", po_id)

@api_router.post("/intl-purchases")
async def create_intl_purchase(data: IntlPurchaseOrderBase, current_user: Dict = Depends(get_current_user)):
    po = IntlPurchaseOrder(**data.model_dump())
    po.order_number = await generate_number("IPO", "intl_purchases")
    po.created_by = current_user['id']
    
    # Calculate totals
    subtotal = sum(line.quantity * line.unit_price for line in data.lines)
    landed_cost = subtotal + data.freight_cost + data.insurance_cost + data.customs_duty + data.other_costs
    
    po.subtotal = subtotal
    po.landed_cost = landed_cost
    po.total_amount = landed_cost
    
    doc = po.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['lines'] = [line.model_dump() for line in data.lines]
    
    await db.intl_purchases.insert_one(doc)
    await log_audit(current_user['id'], current_user['email'], 'CREATE', 'intl_purchase', po.id)
    return {k: v for k, v in doc.items() if k != '_id'}

@api_router.put("/intl-purchases/{po_id}")
async def update_intl_purchase(po_id: str, data: Dict, current_user: Dict = Depends(get_current_user)):
    existing = await db.intl_purchases.find_one({"id": po_id}, {"_id": 0})
    if existing and existing.get('status') == 'posted':
        raise HTTPException(status_code=400, detail="Cannot edit posted document")
    return await crud_update("intl_purchases", po_id, data, current_user)

@api_router.post("/intl-purchases/{po_id}/post")
async def post_intl_purchase(po_id: str, current_user: Dict = Depends(get_current_user)):
    po = await db.intl_purchases.find_one({"id": po_id}, {"_id": 0})
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    if po.get('status') == 'posted':
        raise HTTPException(status_code=400, detail="Already posted")
    
    # Update inventory with landed cost
    total_qty = sum(line['quantity'] for line in po.get('lines', []))
    landed_cost_per_unit = po['landed_cost'] / total_qty if total_qty > 0 else 0
    
    for line in po.get('lines', []):
        line_landed_cost = (line['quantity'] / total_qty) * po['landed_cost'] if total_qty > 0 else line['unit_price']
        await update_inventory(
            item_id=line['item_id'],
            item_name=line['item_name'],
            branch_id=po['branch_id'],
            quantity=line['quantity'],
            unit_cost=line_landed_cost / line['quantity'] if line['quantity'] > 0 else 0,
            movement_type='IN',
            reference_type='intl_purchase',
            reference_id=po_id,
            reference_number=po['order_number']
        )
    
    # Create journal entry
    await create_purchase_journal_entry(po, 'intl')
    
    # Update status
    await db.intl_purchases.update_one(
        {"id": po_id},
        {"$set": {"status": "posted", "posted_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await log_audit(current_user['id'], current_user['email'], 'POST', 'intl_purchase', po_id)
    return {"message": "International purchase order posted"}

# ==================== LOCAL SALES ====================
@api_router.get("/local-sales", response_model=List[Dict])
async def list_local_sales(
    status: Optional[str] = None,
    customer_id: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    filters = {}
    if status:
        filters['status'] = status
    if customer_id:
        filters['customer_id'] = customer_id
    return await crud_list("local_sales", filters)

@api_router.get("/local-sales/{so_id}")
async def get_local_sale(so_id: str, current_user: Dict = Depends(get_current_user)):
    return await crud_get("local_sales", so_id)

@api_router.post("/local-sales")
async def create_local_sale(data: LocalSalesOrderBase, current_user: Dict = Depends(get_current_user)):
    so = LocalSalesOrder(**data.model_dump())
    so.order_number = await generate_number("LSO", "local_sales")
    so.created_by = current_user['id']
    
    # Calculate totals
    subtotal = sum(line.quantity * line.unit_price for line in data.lines)
    vat_amount = sum(line.vat_amount for line in data.lines)
    
    so.subtotal = subtotal
    so.vat_amount = vat_amount
    so.total_amount = subtotal + vat_amount
    
    # Calculate broker commission
    if data.broker_id and data.broker_commission_rate > 0:
        total_qty = sum(line.quantity for line in data.lines)
        if data.broker_commission_type == BrokerCommissionType.PER_MT:
            so.broker_commission = total_qty * data.broker_commission_rate
        else:
            so.broker_commission = subtotal * (data.broker_commission_rate / 100)
    
    doc = so.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['lines'] = [line.model_dump() for line in data.lines]
    
    await db.local_sales.insert_one(doc)
    await log_audit(current_user['id'], current_user['email'], 'CREATE', 'local_sale', so.id)
    return {k: v for k, v in doc.items() if k != '_id'}

@api_router.put("/local-sales/{so_id}")
async def update_local_sale(so_id: str, data: Dict, current_user: Dict = Depends(get_current_user)):
    existing = await db.local_sales.find_one({"id": so_id}, {"_id": 0})
    if existing and existing.get('status') == 'posted':
        raise HTTPException(status_code=400, detail="Cannot edit posted document")
    return await crud_update("local_sales", so_id, data, current_user)

@api_router.post("/local-sales/{so_id}/post")
async def post_local_sale(so_id: str, current_user: Dict = Depends(get_current_user)):
    so = await db.local_sales.find_one({"id": so_id}, {"_id": 0})
    if not so:
        raise HTTPException(status_code=404, detail="Sales order not found")
    
    if so.get('status') == 'posted':
        raise HTTPException(status_code=400, detail="Already posted")
    
    # Check and update inventory
    for line in so.get('lines', []):
        stock = await db.inventory_stock.find_one({
            "item_id": line['item_id'],
            "branch_id": so['branch_id']
        }, {"_id": 0})
        
        current_qty = stock.get('quantity', 0) if stock else 0
        if current_qty < line['quantity']:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {line['item_name']}. Available: {current_qty} MT"
            )
        
        avg_cost = stock.get('avg_cost', 0) if stock else 0
        await update_inventory(
            item_id=line['item_id'],
            item_name=line['item_name'],
            branch_id=so['branch_id'],
            quantity=-line['quantity'],
            unit_cost=avg_cost,
            movement_type='OUT',
            reference_type='local_sale',
            reference_id=so_id,
            reference_number=so['order_number']
        )
    
    # Create journal entry
    await create_sales_journal_entry(so, 'local')
    
    # Update status
    await db.local_sales.update_one(
        {"id": so_id},
        {"$set": {"status": "posted", "posted_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await log_audit(current_user['id'], current_user['email'], 'POST', 'local_sale', so_id)
    return {"message": "Sales order posted"}

# ==================== EXPORT SALES ====================
@api_router.get("/export-sales", response_model=List[Dict])
async def list_export_sales(
    status: Optional[str] = None,
    customer_id: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    filters = {}
    if status:
        filters['status'] = status
    if customer_id:
        filters['customer_id'] = customer_id
    return await crud_list("export_sales", filters)

@api_router.get("/export-sales/{contract_id}")
async def get_export_sale(contract_id: str, current_user: Dict = Depends(get_current_user)):
    return await crud_get("export_sales", contract_id)

@api_router.post("/export-sales")
async def create_export_sale(data: ExportSalesContractBase, current_user: Dict = Depends(get_current_user)):
    contract = ExportSalesContract(**data.model_dump())
    contract.contract_number = await generate_number("EXP", "export_sales", "contract_number")
    contract.created_by = current_user['id']
    
    # Calculate totals (zero-rated VAT for exports)
    subtotal = sum(line.quantity * line.unit_price for line in data.lines)
    
    contract.subtotal = subtotal
    contract.total_amount = subtotal + data.freight_cost
    
    doc = contract.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['lines'] = [line.model_dump() for line in data.lines]
    
    await db.export_sales.insert_one(doc)
    await log_audit(current_user['id'], current_user['email'], 'CREATE', 'export_sale', contract.id)
    return {k: v for k, v in doc.items() if k != '_id'}

@api_router.put("/export-sales/{contract_id}")
async def update_export_sale(contract_id: str, data: Dict, current_user: Dict = Depends(get_current_user)):
    existing = await db.export_sales.find_one({"id": contract_id}, {"_id": 0})
    if existing and existing.get('status') == 'posted':
        raise HTTPException(status_code=400, detail="Cannot edit posted document")
    return await crud_update("export_sales", contract_id, data, current_user)

@api_router.post("/export-sales/{contract_id}/post")
async def post_export_sale(contract_id: str, current_user: Dict = Depends(get_current_user)):
    contract = await db.export_sales.find_one({"id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Export contract not found")
    
    if contract.get('status') == 'posted':
        raise HTTPException(status_code=400, detail="Already posted")
    
    # Check and update inventory
    for line in contract.get('lines', []):
        stock = await db.inventory_stock.find_one({
            "item_id": line['item_id'],
            "branch_id": contract['branch_id']
        }, {"_id": 0})
        
        current_qty = stock.get('quantity', 0) if stock else 0
        if current_qty < line['quantity']:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {line['item_name']}. Available: {current_qty} MT"
            )
        
        avg_cost = stock.get('avg_cost', 0) if stock else 0
        await update_inventory(
            item_id=line['item_id'],
            item_name=line['item_name'],
            branch_id=contract['branch_id'],
            quantity=-line['quantity'],
            unit_cost=avg_cost,
            movement_type='OUT',
            reference_type='export_sale',
            reference_id=contract_id,
            reference_number=contract['contract_number']
        )
    
    # Create journal entry
    await create_sales_journal_entry(contract, 'export')
    
    # Update status
    await db.export_sales.update_one(
        {"id": contract_id},
        {"$set": {"status": "posted", "posted_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await log_audit(current_user['id'], current_user['email'], 'POST', 'export_sale', contract_id)
    return {"message": "Export contract posted"}

# ==================== INVENTORY FUNCTIONS ====================
async def update_inventory(item_id: str, item_name: str, branch_id: str, quantity: float, 
                          unit_cost: float, movement_type: str, reference_type: str,
                          reference_id: str, reference_number: str):
    # Get branch name
    branch = await db.branches.find_one({"id": branch_id}, {"_id": 0})
    branch_name = branch.get('name', '') if branch else ''
    
    # Get or create stock record
    stock = await db.inventory_stock.find_one({
        "item_id": item_id,
        "branch_id": branch_id
    }, {"_id": 0})
    
    if stock:
        old_qty = stock.get('quantity', 0)
        old_value = stock.get('total_value', 0)
        
        if movement_type == 'IN':
            new_qty = old_qty + quantity
            new_value = old_value + (quantity * unit_cost)
            new_avg_cost = new_value / new_qty if new_qty > 0 else 0
        else:  # OUT
            new_qty = old_qty + quantity  # quantity is negative for OUT
            new_value = new_qty * stock.get('avg_cost', 0)
            new_avg_cost = stock.get('avg_cost', 0)
        
        await db.inventory_stock.update_one(
            {"item_id": item_id, "branch_id": branch_id},
            {"$set": {
                "quantity": new_qty,
                "avg_cost": new_avg_cost,
                "total_value": new_value,
                "last_updated": datetime.now(timezone.utc).isoformat()
            }}
        )
        balance_qty = new_qty
        balance_value = new_value
    else:
        # Create new stock record
        new_stock = InventoryStock(
            item_id=item_id,
            item_name=item_name,
            branch_id=branch_id,
            branch_name=branch_name,
            quantity=quantity,
            avg_cost=unit_cost,
            total_value=quantity * unit_cost
        )
        doc = new_stock.model_dump()
        doc['last_updated'] = doc['last_updated'].isoformat()
        await db.inventory_stock.insert_one(doc)
        balance_qty = quantity
        balance_value = quantity * unit_cost
    
    # Create movement record
    movement = InventoryMovement(
        item_id=item_id,
        branch_id=branch_id,
        movement_type=movement_type,
        reference_type=reference_type,
        reference_id=reference_id,
        reference_number=reference_number,
        quantity=abs(quantity),
        unit_cost=unit_cost,
        total_cost=abs(quantity) * unit_cost,
        balance_qty=balance_qty,
        balance_value=balance_value
    )
    mov_doc = movement.model_dump()
    mov_doc['created_at'] = mov_doc['created_at'].isoformat()
    await db.inventory_movements.insert_one(mov_doc)

@api_router.get("/inventory/stock", response_model=List[Dict])
async def get_inventory_stock(
    item_id: Optional[str] = None,
    branch_id: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    filters = {}
    if item_id:
        filters['item_id'] = item_id
    if branch_id:
        filters['branch_id'] = branch_id
    return await crud_list("inventory_stock", filters)

@api_router.get("/inventory/movements", response_model=List[Dict])
async def get_inventory_movements(
    item_id: Optional[str] = None,
    branch_id: Optional[str] = None,
    limit: int = 100,
    current_user: Dict = Depends(get_current_user)
):
    filters = {}
    if item_id:
        filters['item_id'] = item_id
    if branch_id:
        filters['branch_id'] = branch_id
    
    movements = await db.inventory_movements.find(filters, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return movements

# ==================== ACCOUNTING FUNCTIONS ====================
async def create_purchase_journal_entry(po: Dict, po_type: str):
    entry_number = await generate_number("JE", "journal_entries", "entry_number")
    
    if po_type == 'local':
        lines = [
            {"account_code": "1200", "account_name": "Inventory", "debit": po['subtotal'], "credit": 0},
            {"account_code": "1300", "account_name": "VAT Input", "debit": po['vat_amount'], "credit": 0},
            {"account_code": "2100", "account_name": "Accounts Payable", "debit": 0, "credit": po['total_amount']}
        ]
        if po.get('broker_commission', 0) > 0:
            lines.append({"account_code": "5200", "account_name": "Broker Commission Expense", "debit": po['broker_commission'], "credit": 0})
            lines.append({"account_code": "2200", "account_name": "Broker Payable", "debit": 0, "credit": po['broker_commission']})
    else:  # intl
        lines = [
            {"account_code": "1200", "account_name": "Inventory", "debit": po['landed_cost'], "credit": 0},
            {"account_code": "2100", "account_name": "Accounts Payable", "debit": 0, "credit": po['total_amount']}
        ]
    
    total_debit = sum(l['debit'] for l in lines)
    total_credit = sum(l['credit'] for l in lines)
    
    entry = JournalEntry(
        entry_number=entry_number,
        entry_date=po['order_date'],
        reference_type=f"{po_type}_purchase",
        reference_id=po['id'],
        reference_number=po['order_number'],
        description=f"Purchase from {po['supplier_name']}",
        lines=lines,
        total_debit=total_debit,
        total_credit=total_credit,
        created_by=po.get('created_by')
    )
    
    doc = entry.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.journal_entries.insert_one(doc)

async def create_sales_journal_entry(so: Dict, so_type: str):
    entry_number = await generate_number("JE", "journal_entries", "entry_number")
    
    # Calculate COGS
    cogs = 0
    for line in so.get('lines', []):
        stock = await db.inventory_stock.find_one({
            "item_id": line['item_id'],
            "branch_id": so['branch_id']
        }, {"_id": 0})
        if stock:
            cogs += line['quantity'] * stock.get('avg_cost', 0)
    
    if so_type == 'local':
        lines = [
            {"account_code": "1100", "account_name": "Accounts Receivable", "debit": so['total_amount'], "credit": 0},
            {"account_code": "4100", "account_name": "Sales Revenue", "debit": 0, "credit": so['subtotal']},
            {"account_code": "2300", "account_name": "VAT Output", "debit": 0, "credit": so['vat_amount']},
            {"account_code": "5100", "account_name": "Cost of Goods Sold", "debit": cogs, "credit": 0},
            {"account_code": "1200", "account_name": "Inventory", "debit": 0, "credit": cogs}
        ]
        if so.get('broker_commission', 0) > 0:
            lines.append({"account_code": "5200", "account_name": "Broker Commission Expense", "debit": so['broker_commission'], "credit": 0})
            lines.append({"account_code": "2200", "account_name": "Broker Payable", "debit": 0, "credit": so['broker_commission']})
    else:  # export (zero-rated VAT)
        lines = [
            {"account_code": "1100", "account_name": "Accounts Receivable", "debit": so['total_amount'], "credit": 0},
            {"account_code": "4100", "account_name": "Sales Revenue", "debit": 0, "credit": so['subtotal']},
            {"account_code": "5100", "account_name": "Cost of Goods Sold", "debit": cogs, "credit": 0},
            {"account_code": "1200", "account_name": "Inventory", "debit": 0, "credit": cogs}
        ]
    
    total_debit = sum(l['debit'] for l in lines)
    total_credit = sum(l['credit'] for l in lines)
    
    customer_name = so.get('customer_name', '')
    ref_number = so.get('order_number', so.get('contract_number', ''))
    
    entry = JournalEntry(
        entry_number=entry_number,
        entry_date=so.get('order_date', so.get('contract_date', '')),
        reference_type=f"{so_type}_sale",
        reference_id=so['id'],
        reference_number=ref_number,
        description=f"Sale to {customer_name}",
        lines=lines,
        total_debit=total_debit,
        total_credit=total_credit,
        created_by=so.get('created_by')
    )
    
    doc = entry.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.journal_entries.insert_one(doc)

# ==================== CHART OF ACCOUNTS ====================
@api_router.get("/accounts", response_model=List[Dict])
async def list_accounts(current_user: Dict = Depends(get_current_user)):
    return await crud_list("accounts")

@api_router.post("/accounts")
async def create_account(data: AccountBase, current_user: Dict = Depends(get_current_user)):
    account = Account(**data.model_dump())
    doc = account.model_dump()
    await db.accounts.insert_one(doc)
    return {k: v for k, v in doc.items() if k != '_id'}

@api_router.get("/journal-entries", response_model=List[Dict])
async def list_journal_entries(
    reference_type: Optional[str] = None,
    limit: int = 100,
    current_user: Dict = Depends(get_current_user)
):
    filters = {}
    if reference_type:
        filters['reference_type'] = reference_type
    
    entries = await db.journal_entries.find(filters, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return entries

# ==================== AUDIT LOGS ====================
@api_router.get("/audit-logs", response_model=List[Dict])
async def list_audit_logs(
    entity_type: Optional[str] = None,
    user_id: Optional[str] = None,
    limit: int = 100,
    current_user: Dict = Depends(get_current_user)
):
    if current_user['role'] not in ['admin', 'manager']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    filters = {}
    if entity_type:
        filters['entity_type'] = entity_type
    if user_id:
        filters['user_id'] = user_id
    
    logs = await db.audit_logs.find(filters, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return logs

# ==================== DASHBOARD & REPORTS ====================
@api_router.get("/dashboard/kpis")
async def get_dashboard_kpis(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    # Build date filter
    date_filter = {}
    if start_date:
        date_filter["$gte"] = start_date
    if end_date:
        date_filter["$lte"] = end_date
    
    # Purchase filters
    purchase_filter = {"status": "posted"}
    if date_filter:
        purchase_filter["order_date"] = date_filter
    
    # Sales filters  
    sales_filter = {"status": "posted"}
    if date_filter:
        sales_filter["order_date"] = date_filter
    
    # Total purchases using aggregation (local + intl)
    local_purchase_agg = await db.local_purchases.aggregate([
        {"$match": purchase_filter},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]).to_list(1)
    
    # International purchases need to be converted to AED using exchange_rate
    intl_purchase_agg = await db.intl_purchases.aggregate([
        {"$match": purchase_filter},
        {"$group": {"_id": None, "total": {"$sum": {"$multiply": ["$total_amount", "$exchange_rate"]}}}}
    ]).to_list(1)
    
    total_purchases = (local_purchase_agg[0]["total"] if local_purchase_agg else 0) + \
                     (intl_purchase_agg[0]["total"] if intl_purchase_agg else 0)
    
    # Total sales using aggregation (local + export)
    local_sales_agg = await db.local_sales.aggregate([
        {"$match": sales_filter},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]).to_list(1)
    
    # Export sales need to be converted to AED using exchange_rate
    export_sales_agg = await db.export_sales.aggregate([
        {"$match": sales_filter},
        {"$group": {"_id": None, "total": {"$sum": {"$multiply": ["$total_amount", "$exchange_rate"]}}}}
    ]).to_list(1)
    
    total_sales = (local_sales_agg[0]["total"] if local_sales_agg else 0) + \
                 (export_sales_agg[0]["total"] if export_sales_agg else 0)
    
    # Total inventory value using aggregation (not filtered by date - current snapshot)
    inventory_agg = await db.inventory_stock.aggregate([
        {"$group": {"_id": None, "total_value": {"$sum": "$total_value"}, "total_qty": {"$sum": "$quantity"}}}
    ]).to_list(1)
    inventory_value = inventory_agg[0]["total_value"] if inventory_agg else 0
    inventory_qty = inventory_agg[0]["total_qty"] if inventory_agg else 0
    
    # Gross margin
    gross_margin = total_sales - total_purchases
    margin_percentage = (gross_margin / total_sales * 100) if total_sales > 0 else 0
    
    # Pending documents (not filtered by date)
    pending_local_po = await db.local_purchases.count_documents({"status": {"$in": ["draft", "pending"]}})
    pending_intl_po = await db.intl_purchases.count_documents({"status": {"$in": ["draft", "pending"]}})
    pending_local_so = await db.local_sales.count_documents({"status": {"$in": ["draft", "pending"]}})
    pending_export = await db.export_sales.count_documents({"status": {"$in": ["draft", "pending"]}})
    
    # Weighbridge entries for period
    wb_filter = {}
    if start_date and end_date:
        wb_filter["created_at"] = {"$gte": start_date, "$lte": end_date + "T23:59:59"}
    elif start_date:
        wb_filter["created_at"] = {"$gte": start_date}
    elif end_date:
        wb_filter["created_at"] = {"$lte": end_date + "T23:59:59"}
    else:
        # Default to today
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        wb_filter["created_at"] = {"$regex": f"^{today}"}
    
    wb_entries = await db.weighbridge_entries.count_documents(wb_filter)
    
    return {
        "total_purchases": total_purchases,
        "total_sales": total_sales,
        "gross_margin": gross_margin,
        "margin_percentage": round(margin_percentage, 2),
        "inventory_value": inventory_value,
        "inventory_qty": inventory_qty,
        "pending_documents": {
            "local_purchase": pending_local_po,
            "intl_purchase": pending_intl_po,
            "local_sales": pending_local_so,
            "export_sales": pending_export
        },
        "weighbridge_entries": wb_entries,
        "date_range": {
            "start": start_date,
            "end": end_date
        }
    }

@api_router.get("/reports/purchase-register")
async def purchase_register(
    type: str = "local",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    collection = "local_purchases" if type == "local" else "intl_purchases"
    filters = {"status": "posted"}
    
    if start_date:
        filters['order_date'] = {"$gte": start_date}
    if end_date:
        if 'order_date' in filters:
            filters['order_date']['$lte'] = end_date
        else:
            filters['order_date'] = {"$lte": end_date}
    
    purchases = await db[collection].find(filters, {"_id": 0}).to_list(1000)
    
    total = sum(p.get('total_amount', 0) for p in purchases)
    vat_total = sum(p.get('vat_amount', 0) for p in purchases)
    
    return {
        "type": type,
        "purchases": purchases,
        "summary": {
            "count": len(purchases),
            "total_amount": total,
            "total_vat": vat_total
        }
    }

@api_router.get("/reports/sales-register")
async def sales_register(
    type: str = "local",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    collection = "local_sales" if type == "local" else "export_sales"
    date_field = "order_date" if type == "local" else "contract_date"
    filters = {"status": "posted"}
    
    if start_date:
        filters[date_field] = {"$gte": start_date}
    if end_date:
        if date_field in filters:
            filters[date_field]['$lte'] = end_date
        else:
            filters[date_field] = {"$lte": end_date}
    
    sales = await db[collection].find(filters, {"_id": 0}).to_list(1000)
    
    total = sum(s.get('total_amount', 0) for s in sales)
    vat_total = sum(s.get('vat_amount', 0) for s in sales)
    
    return {
        "type": type,
        "sales": sales,
        "summary": {
            "count": len(sales),
            "total_amount": total,
            "total_vat": vat_total
        }
    }

@api_router.get("/reports/vat")
@api_router.get("/reports/vat-report")
async def vat_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    # Input VAT from local purchases
    lp_filters = {"status": "posted"}
    if start_date:
        lp_filters['order_date'] = {"$gte": start_date}
    if end_date:
        if 'order_date' in lp_filters:
            lp_filters['order_date']['$lte'] = end_date
        else:
            lp_filters['order_date'] = {"$lte": end_date}
    
    local_purchases = await db.local_purchases.find(lp_filters, {"_id": 0}).to_list(1000)
    input_vat = sum(p.get('vat_amount', 0) for p in local_purchases)
    input_taxable = sum(p.get('subtotal', 0) for p in local_purchases)
    
    # Output VAT from local sales
    ls_filters = {"status": "posted"}
    if start_date:
        ls_filters['order_date'] = {"$gte": start_date}
    if end_date:
        if 'order_date' in ls_filters:
            ls_filters['order_date']['$lte'] = end_date
        else:
            ls_filters['order_date'] = {"$lte": end_date}
    
    local_sales = await db.local_sales.find(ls_filters, {"_id": 0}).to_list(1000)
    output_vat = sum(s.get('vat_amount', 0) for s in local_sales)
    output_taxable = sum(s.get('subtotal', 0) for s in local_sales)
    
    # Zero-rated exports
    exp_filters = {"status": "posted"}
    if start_date:
        exp_filters['contract_date'] = {"$gte": start_date}
    if end_date:
        if 'contract_date' in exp_filters:
            exp_filters['contract_date']['$lte'] = end_date
        else:
            exp_filters['contract_date'] = {"$lte": end_date}
    
    exports = await db.export_sales.find(exp_filters, {"_id": 0}).to_list(1000)
    zero_rated = sum(e.get('subtotal', 0) for e in exports)
    
    net_vat = output_vat - input_vat
    
    return {
        "period": {"start": start_date, "end": end_date},
        "output_vat": {
            "taxable_sales": output_taxable,
            "vat_amount": output_vat
        },
        "input_vat": {
            "taxable_purchases": input_taxable,
            "vat_amount": input_vat
        },
        "zero_rated_exports": zero_rated,
        "net_vat_payable": net_vat
    }

@api_router.get("/reports/stock-aging")
async def stock_aging(current_user: Dict = Depends(get_current_user)):
    stock = await db.inventory_stock.find({}, {"_id": 0}).to_list(1000)
    
    aging_data = []
    for item in stock:
        if item.get('quantity', 0) > 0:
            aging_data.append({
                "item_id": item.get('item_id'),
                "item_name": item.get('item_name'),
                "branch_name": item.get('branch_name'),
                "quantity": item.get('quantity'),
                "avg_cost": item.get('avg_cost'),
                "total_value": item.get('total_value'),
                "last_updated": item.get('last_updated')
            })
    
    return {"stock": aging_data}

@api_router.get("/reports/broker-commission")
async def broker_commission_report(
    broker_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    # Gather all broker commissions from purchases and sales
    commissions = []
    
    # Local purchases
    lp_filters = {"status": "posted", "broker_id": {"$ne": None}}
    if broker_id:
        lp_filters['broker_id'] = broker_id
    
    local_purchases = await db.local_purchases.find(lp_filters, {"_id": 0}).to_list(1000)
    for lp in local_purchases:
        if lp.get('broker_commission', 0) > 0:
            commissions.append({
                "type": "Local Purchase",
                "reference": lp.get('order_number'),
                "date": lp.get('order_date'),
                "broker_id": lp.get('broker_id'),
                "amount": lp.get('broker_commission')
            })
    
    # Local sales
    ls_filters = {"status": "posted", "broker_id": {"$ne": None}}
    if broker_id:
        ls_filters['broker_id'] = broker_id
    
    local_sales = await db.local_sales.find(ls_filters, {"_id": 0}).to_list(1000)
    for ls in local_sales:
        if ls.get('broker_commission', 0) > 0:
            commissions.append({
                "type": "Local Sale",
                "reference": ls.get('order_number'),
                "date": ls.get('order_date'),
                "broker_id": ls.get('broker_id'),
                "amount": ls.get('broker_commission')
            })
    
    total_commission = sum(c['amount'] for c in commissions)
    
    return {
        "commissions": commissions,
        "total": total_commission
    }

# ==================== CUSTOMER/SUPPLIER LEDGER ====================
@api_router.get("/reports/customer-ledger/{customer_id}")
async def customer_ledger(
    customer_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    entries = []
    running_balance = 0
    
    # Get all sales (debits to customer)
    sales_filters = {"customer_id": customer_id, "status": "posted"}
    if start_date:
        sales_filters['order_date'] = {"$gte": start_date}
    if end_date:
        if 'order_date' in sales_filters:
            sales_filters['order_date']['$lte'] = end_date
        else:
            sales_filters['order_date'] = {"$lte": end_date}
    
    local_sales = await db.local_sales.find(sales_filters, {"_id": 0}).to_list(1000)
    for sale in local_sales:
        running_balance += sale.get('total_amount', 0)
        entries.append({
            "date": sale.get('order_date'),
            "type": "Invoice",
            "reference": sale.get('order_number'),
            "description": f"Local Sale - {sale.get('order_number')}",
            "debit": sale.get('total_amount', 0),
            "credit": 0,
            "balance": running_balance
        })
    
    # Get all payments received
    payments = await db.payments.find({
        "party_type": "customer",
        "party_id": customer_id,
        "status": "posted"
    }, {"_id": 0}).to_list(1000)
    
    for payment in payments:
        running_balance -= payment.get('amount', 0)
        entries.append({
            "date": payment.get('payment_date'),
            "type": "Receipt",
            "reference": payment.get('receipt_number'),
            "description": payment.get('notes') or f"Payment Received",
            "debit": 0,
            "credit": payment.get('amount', 0),
            "balance": running_balance
        })
    
    # Sort by date
    entries.sort(key=lambda x: x['date'] or '')
    
    # Recalculate running balance
    running = 0
    for entry in entries:
        running += entry['debit'] - entry['credit']
        entry['balance'] = running
    
    total_debit = sum(e['debit'] for e in entries)
    total_credit = sum(e['credit'] for e in entries)
    
    return {
        "customer_name": customer.get('name'),
        "opening_balance": 0,
        "entries": entries,
        "total_debit": total_debit,
        "total_credit": total_credit,
        "closing_balance": total_debit - total_credit
    }

@api_router.get("/reports/supplier-ledger/{supplier_id}")
async def supplier_ledger(
    supplier_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    supplier = await db.suppliers.find_one({"id": supplier_id}, {"_id": 0})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    entries = []
    running_balance = 0
    
    # Get all purchases (credits - we owe supplier)
    purchase_filters = {"supplier_id": supplier_id, "status": "posted"}
    if start_date:
        purchase_filters['order_date'] = {"$gte": start_date}
    if end_date:
        if 'order_date' in purchase_filters:
            purchase_filters['order_date']['$lte'] = end_date
        else:
            purchase_filters['order_date'] = {"$lte": end_date}
    
    local_purchases = await db.local_purchases.find(purchase_filters, {"_id": 0}).to_list(1000)
    for purchase in local_purchases:
        running_balance += purchase.get('total_amount', 0)
        entries.append({
            "date": purchase.get('order_date'),
            "type": "Bill",
            "reference": purchase.get('order_number'),
            "description": f"Local Purchase - {purchase.get('order_number')}",
            "debit": 0,
            "credit": purchase.get('total_amount', 0),
            "balance": running_balance
        })
    
    # Get all payments made
    payments = await db.payments.find({
        "party_type": "supplier",
        "party_id": supplier_id,
        "status": "posted"
    }, {"_id": 0}).to_list(1000)
    
    for payment in payments:
        running_balance -= payment.get('amount', 0)
        entries.append({
            "date": payment.get('payment_date'),
            "type": "Payment",
            "reference": payment.get('receipt_number'),
            "description": payment.get('notes') or f"Payment Made",
            "debit": payment.get('amount', 0),
            "credit": 0,
            "balance": running_balance
        })
    
    # Sort by date
    entries.sort(key=lambda x: x['date'] or '')
    
    # Recalculate running balance
    running = 0
    for entry in entries:
        running += entry['credit'] - entry['debit']
        entry['balance'] = running
    
    total_debit = sum(e['debit'] for e in entries)
    total_credit = sum(e['credit'] for e in entries)
    
    return {
        "supplier_name": supplier.get('name'),
        "opening_balance": 0,
        "entries": entries,
        "total_debit": total_debit,
        "total_credit": total_credit,
        "closing_balance": total_credit - total_debit
    }

@api_router.get("/reports/trial-balance")
async def trial_balance_report(
    as_of_date: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    """Generate Trial Balance Report showing all account balances"""
    
    # Get all accounts
    accounts = await db.accounts.find({}, {"_id": 0}).sort("code", 1).to_list(1000)
    
    # Build date filter for journal entries
    je_filter = {}
    if as_of_date:
        je_filter["entry_date"] = {"$lte": as_of_date}
    
    # Calculate balances using aggregation pipeline (much more efficient)
    balance_pipeline = [
        {"$match": je_filter},
        {"$unwind": "$lines"},
        {"$group": {
            "_id": "$lines.account_code",
            "debit": {"$sum": {"$ifNull": ["$lines.debit", 0]}},
            "credit": {"$sum": {"$ifNull": ["$lines.credit", 0]}}
        }}
    ]
    
    balance_results = await db.journal_entries.aggregate(balance_pipeline).to_list(1000)
    
    # Convert to dictionary for quick lookup
    account_balances = {
        result["_id"]: {"debit": result["debit"], "credit": result["credit"]}
        for result in balance_results
    }
    
    # Build trial balance rows
    trial_balance = []
    total_debit = 0
    total_credit = 0
    
    for account in accounts:
        code = account.get('code', '')
        balance_data = account_balances.get(code, {'debit': 0, 'credit': 0})
        
        debit_total = balance_data['debit']
        credit_total = balance_data['credit']
        
        # Calculate net balance based on account type
        account_type = account.get('type', '').lower()
        
        # Assets and Expenses normally have debit balances
        # Liabilities, Equity, and Revenue normally have credit balances
        if account_type in ['asset', 'expense']:
            net_debit = max(0, debit_total - credit_total)
            net_credit = max(0, credit_total - debit_total)
        else:  # liability, equity, revenue
            net_credit = max(0, credit_total - debit_total)
            net_debit = max(0, debit_total - credit_total)
        
        # Only include accounts with non-zero balances or all accounts
        trial_balance.append({
            "account_code": code,
            "account_name": account.get('name', ''),
            "account_type": account.get('type', ''),
            "debit": round(net_debit, 2),
            "credit": round(net_credit, 2)
        })
        
        total_debit += net_debit
        total_credit += net_credit
    
    # Check if balanced
    is_balanced = abs(total_debit - total_credit) < 0.01
    
    return {
        "as_of_date": as_of_date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "accounts": trial_balance,
        "total_debit": round(total_debit, 2),
        "total_credit": round(total_credit, 2),
        "difference": round(total_debit - total_credit, 2),
        "is_balanced": is_balanced
    }

# ==================== PAYMENTS ====================
@api_router.get("/payments", response_model=List[Dict])
async def list_payments(
    party_type: Optional[str] = None,
    party_id: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    filters = {"is_active": True}
    if party_type:
        filters['party_type'] = party_type
    if party_id:
        filters['party_id'] = party_id
    return await crud_list("payments", filters)

@api_router.get("/payments/{payment_id}")
async def get_payment(payment_id: str, current_user: Dict = Depends(get_current_user)):
    return await crud_get("payments", payment_id)

@api_router.post("/payments")
async def create_payment(data: Dict, current_user: Dict = Depends(get_current_user)):
    payment_id = str(uuid.uuid4())
    
    # Generate receipt number
    receipt_type = "RV" if data.get('type') == 'received' else "PV"
    receipt_number = await generate_number(receipt_type, "payments")
    
    payment = {
        "id": payment_id,
        "receipt_number": receipt_number,
        "type": data.get('type', 'received'),  # received (from customer) or paid (to supplier)
        "party_type": data.get('party_type'),  # customer or supplier
        "party_id": data.get('party_id'),
        "party_name": data.get('party_name'),
        "payment_date": data.get('payment_date'),
        "amount": data.get('amount', 0),
        "currency": data.get('currency', 'AED'),
        "payment_method": data.get('payment_method', 'cash'),
        "reference_number": data.get('reference_number'),
        "document_number": data.get('document_number'),
        "notes": data.get('notes'),
        "status": "draft",
        "is_active": True,
        "created_by": current_user['id'],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.payments.insert_one(payment)
    await log_audit(current_user['id'], current_user['email'], 'CREATE', 'payment', payment_id)
    return {k: v for k, v in payment.items() if k != '_id'}

@api_router.post("/payments/{payment_id}/post")
async def post_payment(payment_id: str, current_user: Dict = Depends(get_current_user)):
    payment = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment.get('status') == 'posted':
        raise HTTPException(status_code=400, detail="Already posted")
    
    # Create journal entry for payment
    je_id = str(uuid.uuid4())
    je_number = await generate_number("JE", "journal_entries")
    
    if payment.get('type') == 'received':
        # Received from customer: Dr Cash, Cr Accounts Receivable
        entries = [
            {"account_code": "1000", "account_name": "Cash", "debit": payment['amount'], "credit": 0},
            {"account_code": "1100", "account_name": "Accounts Receivable", "debit": 0, "credit": payment['amount']}
        ]
    else:
        # Paid to supplier: Dr Accounts Payable, Cr Cash
        entries = [
            {"account_code": "2000", "account_name": "Accounts Payable", "debit": payment['amount'], "credit": 0},
            {"account_code": "1000", "account_name": "Cash", "debit": 0, "credit": payment['amount']}
        ]
    
    je = {
        "id": je_id,
        "entry_number": je_number,
        "entry_date": payment['payment_date'],
        "reference_type": "payment",
        "reference_id": payment_id,
        "description": f"Payment {'received from' if payment['type'] == 'received' else 'made to'} {payment.get('party_name', 'N/A')}",
        "entries": entries,
        "total_debit": payment['amount'],
        "total_credit": payment['amount'],
        "created_by": current_user['id'],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.journal_entries.insert_one(je)
    
    await db.payments.update_one(
        {"id": payment_id},
        {"$set": {"status": "posted", "posted_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await log_audit(current_user['id'], current_user['email'], 'POST', 'payment', payment_id)
    return {"message": "Payment posted"}

# ==================== DOCUMENT CANCELLATION ====================
@api_router.post("/local-purchases/{po_id}/cancel")
async def cancel_local_purchase(po_id: str, reason: str = Query(...), current_user: Dict = Depends(get_current_user)):
    po = await db.local_purchases.find_one({"id": po_id}, {"_id": 0})
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    if po.get('status') == 'cancelled':
        raise HTTPException(status_code=400, detail="Already cancelled")
    
    if po.get('status') == 'posted':
        # Reverse inventory movements
        for line in po.get('lines', []):
            stock = await db.inventory_stock.find_one({
                "item_id": line['item_id'],
                "branch_id": po['branch_id']
            }, {"_id": 0})
            
            avg_cost = stock.get('avg_cost', 0) if stock else line.get('unit_price', 0)
            await update_inventory(
                item_id=line['item_id'],
                item_name=line['item_name'],
                branch_id=po['branch_id'],
                quantity=-line['quantity'],  # Reverse
                unit_cost=avg_cost,
                movement_type='OUT',
                reference_type='local_purchase_cancel',
                reference_id=po_id,
                reference_number=f"CANCEL-{po['order_number']}"
            )
        
        # Create reversal journal entry
        je_id = str(uuid.uuid4())
        je_number = await generate_number("JE", "journal_entries")
        
        je = {
            "id": je_id,
            "entry_number": je_number,
            "entry_date": datetime.now(timezone.utc).strftime('%Y-%m-%d'),
            "reference_type": "local_purchase_cancel",
            "reference_id": po_id,
            "description": f"Cancellation reversal for {po['order_number']} - {reason}",
            "entries": [
                {"account_code": "2000", "account_name": "Accounts Payable", "debit": po['total_amount'], "credit": 0},
                {"account_code": "5000", "account_name": "Inventory", "debit": 0, "credit": po['subtotal']},
                {"account_code": "1200", "account_name": "Input VAT", "debit": 0, "credit": po.get('vat_amount', 0)}
            ],
            "total_debit": po['total_amount'],
            "total_credit": po['total_amount'],
            "created_by": current_user['id'],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.journal_entries.insert_one(je)
    
    await db.local_purchases.update_one(
        {"id": po_id},
        {"$set": {
            "status": "cancelled",
            "cancellation_reason": reason,
            "cancelled_at": datetime.now(timezone.utc).isoformat(),
            "cancelled_by": current_user['id']
        }}
    )
    
    await log_audit(current_user['id'], current_user['email'], 'CANCEL', 'local_purchase', po_id, {"reason": reason})
    return {"message": "Purchase order cancelled"}

@api_router.post("/local-sales/{so_id}/cancel")
async def cancel_local_sale(so_id: str, reason: str = Query(...), current_user: Dict = Depends(get_current_user)):
    so = await db.local_sales.find_one({"id": so_id}, {"_id": 0})
    if not so:
        raise HTTPException(status_code=404, detail="Sales order not found")
    
    if so.get('status') == 'cancelled':
        raise HTTPException(status_code=400, detail="Already cancelled")
    
    if so.get('status') == 'posted':
        # Reverse inventory movements (add back stock)
        for line in so.get('lines', []):
            stock = await db.inventory_stock.find_one({
                "item_id": line['item_id'],
                "branch_id": so['branch_id']
            }, {"_id": 0})
            
            avg_cost = stock.get('avg_cost', 0) if stock else line.get('unit_price', 0)
            await update_inventory(
                item_id=line['item_id'],
                item_name=line['item_name'],
                branch_id=so['branch_id'],
                quantity=line['quantity'],  # Add back
                unit_cost=avg_cost,
                movement_type='IN',
                reference_type='local_sale_cancel',
                reference_id=so_id,
                reference_number=f"CANCEL-{so['order_number']}"
            )
        
        # Create reversal journal entry
        je_id = str(uuid.uuid4())
        je_number = await generate_number("JE", "journal_entries")
        
        je = {
            "id": je_id,
            "entry_number": je_number,
            "entry_date": datetime.now(timezone.utc).strftime('%Y-%m-%d'),
            "reference_type": "local_sale_cancel",
            "reference_id": so_id,
            "description": f"Cancellation reversal for {so['order_number']} - {reason}",
            "entries": [
                {"account_code": "4000", "account_name": "Sales Revenue", "debit": so['subtotal'], "credit": 0},
                {"account_code": "2100", "account_name": "Output VAT", "debit": so.get('vat_amount', 0), "credit": 0},
                {"account_code": "1100", "account_name": "Accounts Receivable", "debit": 0, "credit": so['total_amount']}
            ],
            "total_debit": so['total_amount'],
            "total_credit": so['total_amount'],
            "created_by": current_user['id'],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.journal_entries.insert_one(je)
    
    await db.local_sales.update_one(
        {"id": so_id},
        {"$set": {
            "status": "cancelled",
            "cancellation_reason": reason,
            "cancelled_at": datetime.now(timezone.utc).isoformat(),
            "cancelled_by": current_user['id']
        }}
    )
    
    await log_audit(current_user['id'], current_user['email'], 'CANCEL', 'local_sale', so_id, {"reason": reason})
    return {"message": "Sales order cancelled"}

# ==================== BACKUP, RESTORE & RESET ====================
# All collections that need to be backed up
BACKUP_COLLECTIONS = [
    'users', 'companies', 'branches', 'customers', 'suppliers', 'brokers',
    'scrap_categories', 'scrap_items', 'vat_codes', 'currencies', 'payment_terms',
    'incoterms', 'ports', 'weighbridges', 'accounts',
    'local_purchases', 'intl_purchases', 'local_sales', 'export_sales',
    'weighbridge_entries', 'inventory_stock', 'inventory_movements',
    'journal_entries', 'payments', 'audit_logs', 'number_sequences'
]

def require_admin(current_user: Dict):
    """Helper to check admin role"""
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")

@api_router.get("/admin/backup")
async def create_backup(current_user: Dict = Depends(get_current_user)):
    """Create a complete backup of all data"""
    require_admin(current_user)
    
    backup_data = {
        "metadata": {
            "version": "1.0",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": current_user['email'],
            "collections": BACKUP_COLLECTIONS
        },
        "data": {}
    }
    
    for collection_name in BACKUP_COLLECTIONS:
        collection = db[collection_name]
        documents = await collection.find({}, {"_id": 0}).to_list(None)
        backup_data["data"][collection_name] = documents
    
    await log_audit(current_user['id'], current_user['email'], 'BACKUP', 'system', None, {
        "collections": BACKUP_COLLECTIONS,
        "record_counts": {col: len(backup_data["data"].get(col, [])) for col in BACKUP_COLLECTIONS}
    })
    
    return backup_data

@api_router.post("/admin/restore")
async def restore_backup(backup_data: Dict, current_user: Dict = Depends(get_current_user)):
    """Restore data from a backup file"""
    require_admin(current_user)
    
    # Validate backup structure
    if "metadata" not in backup_data or "data" not in backup_data:
        raise HTTPException(status_code=400, detail="Invalid backup file format")
    
    if backup_data["metadata"].get("version") != "1.0":
        raise HTTPException(status_code=400, detail="Unsupported backup version")
    
    restored_counts = {}
    errors = []
    
    for collection_name, documents in backup_data["data"].items():
        if collection_name not in BACKUP_COLLECTIONS:
            continue
        
        try:
            collection = db[collection_name]
            
            # Clear existing data
            await collection.delete_many({})
            
            # Insert backup data
            if documents and len(documents) > 0:
                await collection.insert_many(documents)
            
            restored_counts[collection_name] = len(documents)
        except Exception as e:
            errors.append(f"{collection_name}: {str(e)}")
    
    await log_audit(current_user['id'], current_user['email'], 'RESTORE', 'system', None, {
        "backup_date": backup_data["metadata"].get("created_at"),
        "backup_by": backup_data["metadata"].get("created_by"),
        "restored_counts": restored_counts,
        "errors": errors
    })
    
    if errors:
        return {
            "message": "Restore completed with errors",
            "restored_counts": restored_counts,
            "errors": errors
        }
    
    return {
        "message": "Restore completed successfully",
        "restored_counts": restored_counts
    }

@api_router.post("/admin/reset")
async def reset_all_data(
    confirm: str = Query(..., description="Must be 'CONFIRM_RESET' to proceed"),
    preserve_users: bool = Query(True, description="Keep user accounts"),
    preserve_master_data: bool = Query(False, description="Keep master data (companies, branches, etc.)"),
    current_user: Dict = Depends(get_current_user)
):
    """Reset all data - DESTRUCTIVE OPERATION"""
    require_admin(current_user)
    
    if confirm != "CONFIRM_RESET":
        raise HTTPException(status_code=400, detail="Must confirm reset with 'CONFIRM_RESET'")
    
    deleted_counts = {}
    
    # Collections that can be preserved
    master_collections = ['companies', 'branches', 'customers', 'suppliers', 'brokers',
                          'scrap_categories', 'scrap_items', 'vat_codes', 'currencies',
                          'payment_terms', 'incoterms', 'ports', 'weighbridges', 'accounts']
    
    for collection_name in BACKUP_COLLECTIONS:
        # Skip users if preserve_users is True
        if preserve_users and collection_name == 'users':
            continue
        
        # Skip master data if preserve_master_data is True
        if preserve_master_data and collection_name in master_collections:
            continue
        
        # Skip audit logs (always keep for compliance)
        if collection_name == 'audit_logs':
            continue
        
        try:
            collection = db[collection_name]
            result = await collection.delete_many({})
            deleted_counts[collection_name] = result.deleted_count
        except Exception as e:
            deleted_counts[collection_name] = f"Error: {str(e)}"
    
    # Reset number sequences if not preserving master data
    if not preserve_master_data:
        await db.number_sequences.delete_many({})
        deleted_counts['number_sequences'] = 'reset'
    
    await log_audit(current_user['id'], current_user['email'], 'RESET', 'system', None, {
        "preserve_users": preserve_users,
        "preserve_master_data": preserve_master_data,
        "deleted_counts": deleted_counts
    })
    
    return {
        "message": "Data reset completed",
        "deleted_counts": deleted_counts,
        "preserved": {
            "users": preserve_users,
            "master_data": preserve_master_data,
            "audit_logs": True
        }
    }

@api_router.get("/admin/stats")
async def get_system_stats(current_user: Dict = Depends(get_current_user)):
    """Get statistics about all collections"""
    require_admin(current_user)
    
    stats = {}
    for collection_name in BACKUP_COLLECTIONS:
        collection = db[collection_name]
        count = await collection.count_documents({})
        stats[collection_name] = count
    
    return {
        "collections": stats,
        "total_records": sum(stats.values()),
        "generated_at": datetime.now(timezone.utc).isoformat()
    }

# ==================== SCHEDULED BACKUPS ====================
async def execute_scheduled_backup():
    """Execute a scheduled backup and save to disk"""
    import json
    try:
        backup_data = {
            "metadata": {
                "version": "1.0",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": "scheduled_backup",
                "collections": BACKUP_COLLECTIONS
            },
            "data": {}
        }
        
        for collection_name in BACKUP_COLLECTIONS:
            collection = db[collection_name]
            documents = await collection.find({}, {"_id": 0}).to_list(None)
            backup_data["data"][collection_name] = documents
        
        # Save backup to file
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        backup_file = BACKUP_DIR / f"scheduled_backup_{timestamp}.json"
        with open(backup_file, 'w') as f:
            json.dump(backup_data, f, indent=2, default=str)
        
        # Log the backup
        record_counts = {col: len(backup_data["data"].get(col, [])) for col in BACKUP_COLLECTIONS}
        
        # Record backup in database
        backup_record = {
            "id": str(uuid.uuid4()),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "success",
            "file_path": str(backup_file),
            "record_counts": record_counts,
            "total_records": sum(record_counts.values())
        }
        await db.backup_history.insert_one(backup_record)
        
        # Clean up old backups (keep last 10)
        old_backups = sorted(BACKUP_DIR.glob("scheduled_backup_*.json"), reverse=True)[10:]
        for old_file in old_backups:
            old_file.unlink()
        
        logging.info(f"Scheduled backup completed: {backup_file}")
        return True
    except Exception as e:
        # Log failure
        backup_record = {
            "id": str(uuid.uuid4()),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "failed",
            "error": str(e)
        }
        await db.backup_history.insert_one(backup_record)
        logging.error(f"Scheduled backup failed: {e}")
        return False

def schedule_backup_job(frequency: str, time_str: str):
    """Schedule or reschedule the backup job"""
    job_id = "scheduled_backup"
    
    # Remove existing job if any
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
    
    hour, minute = map(int, time_str.split(':'))
    
    if frequency == 'daily':
        trigger = CronTrigger(hour=hour, minute=minute)
    elif frequency == 'weekly':
        trigger = CronTrigger(day_of_week='mon', hour=hour, minute=minute)
    elif frequency == 'monthly':
        trigger = CronTrigger(day=1, hour=hour, minute=minute)
    else:
        return
    
    scheduler.add_job(
        execute_scheduled_backup,
        trigger,
        id=job_id,
        replace_existing=True
    )
    logging.info(f"Scheduled backup job configured: {frequency} at {time_str}")

@api_router.get("/admin/backup-schedule")
async def get_backup_schedule(current_user: Dict = Depends(get_current_user)):
    """Get the current backup schedule settings"""
    require_admin(current_user)
    
    settings = await db.system_settings.find_one({"type": "backup_schedule"}, {"_id": 0})
    if not settings:
        settings = {
            "enabled": False,
            "frequency": "daily",
            "time": "02:00"
        }
    
    # Get backup history
    history = await db.backup_history.find({}, {"_id": 0}).sort("created_at", -1).to_list(10)
    
    return {
        "enabled": settings.get("enabled", False),
        "frequency": settings.get("frequency", "daily"),
        "time": settings.get("time", "02:00"),
        "last_backup": history[0] if history else None,
        "history": history
    }

@api_router.post("/admin/backup-schedule")
async def save_backup_schedule(
    schedule: Dict,
    current_user: Dict = Depends(get_current_user)
):
    """Save backup schedule settings"""
    require_admin(current_user)
    
    enabled = schedule.get("enabled", False)
    frequency = schedule.get("frequency", "daily")
    time_str = schedule.get("time", "02:00")
    
    # Validate frequency
    if frequency not in ['daily', 'weekly', 'monthly']:
        raise HTTPException(status_code=400, detail="Invalid frequency. Must be daily, weekly, or monthly")
    
    # Validate time format
    try:
        hour, minute = map(int, time_str.split(':'))
        if not (0 <= hour <= 23 and 0 <= minute <= 59):
            raise ValueError()
    except:
        raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM")
    
    # Save settings
    await db.system_settings.update_one(
        {"type": "backup_schedule"},
        {"$set": {
            "type": "backup_schedule",
            "enabled": enabled,
            "frequency": frequency,
            "time": time_str,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": current_user['email']
        }},
        upsert=True
    )
    
    # Update scheduler
    if enabled:
        schedule_backup_job(frequency, time_str)
    else:
        if scheduler.get_job("scheduled_backup"):
            scheduler.remove_job("scheduled_backup")
    
    await log_audit(current_user['id'], current_user['email'], 'UPDATE', 'backup_schedule', None, None, {
        "enabled": enabled,
        "frequency": frequency,
        "time": time_str
    })
    
    return {"message": "Backup schedule saved successfully", "enabled": enabled}

@api_router.post("/admin/backup-now")
async def run_backup_now(current_user: Dict = Depends(get_current_user)):
    """Trigger an immediate scheduled backup"""
    require_admin(current_user)
    
    success = await execute_scheduled_backup()
    if success:
        return {"message": "Backup completed successfully", "status": "success"}
    else:
        raise HTTPException(status_code=500, detail="Backup failed")

# ==================== SEED DATA ====================
@api_router.post("/seed-data")
async def seed_data(current_user: Dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin only")
    
    # UAE VAT Codes
    vat_codes = [
        {"name": "Standard Rate", "code": "SR", "rate": 5, "description": "UAE Standard VAT 5%", "is_default": True, "is_active": True},
        {"name": "Zero Rate", "code": "ZR", "rate": 0, "description": "Zero Rated (Exports)", "is_default": False, "is_active": True},
        {"name": "Exempt", "code": "EX", "rate": 0, "description": "VAT Exempt", "is_default": False, "is_active": True}
    ]
    for vc in vat_codes:
        existing = await db.vat_codes.find_one({"code": vc['code']})
        if not existing:
            vc['id'] = str(uuid.uuid4())
            vc['created_at'] = datetime.now(timezone.utc).isoformat()
            await db.vat_codes.insert_one(vc)
    
    # Currencies
    currencies = [
        {"name": "UAE Dirham", "code": "AED", "symbol": "د.إ", "exchange_rate": 1.0, "is_base": True, "is_active": True},
        {"name": "US Dollar", "code": "USD", "symbol": "$", "exchange_rate": 3.67, "is_base": False, "is_active": True},
        {"name": "Euro", "code": "EUR", "symbol": "€", "exchange_rate": 4.0, "is_base": False, "is_active": True},
        {"name": "Indian Rupee", "code": "INR", "symbol": "₹", "exchange_rate": 0.044, "is_base": False, "is_active": True}
    ]
    for curr in currencies:
        existing = await db.currencies.find_one({"code": curr['code']})
        if not existing:
            curr['id'] = str(uuid.uuid4())
            curr['updated_at'] = datetime.now(timezone.utc).isoformat()
            await db.currencies.insert_one(curr)
    
    # Payment Terms
    payment_terms = [
        {"name": "Cash", "code": "CASH", "days": 0, "description": "Immediate payment"},
        {"name": "Net 15", "code": "NET15", "days": 15, "description": "Payment in 15 days"},
        {"name": "Net 30", "code": "NET30", "days": 30, "description": "Payment in 30 days"},
        {"name": "Net 60", "code": "NET60", "days": 60, "description": "Payment in 60 days"}
    ]
    for pt in payment_terms:
        existing = await db.payment_terms.find_one({"code": pt['code']})
        if not existing:
            pt['id'] = str(uuid.uuid4())
            pt['is_active'] = True
            await db.payment_terms.insert_one(pt)
    
    # Incoterms
    incoterms = [
        {"name": "Ex Works", "code": "EXW", "description": "Seller delivers goods at their premises"},
        {"name": "Free on Board", "code": "FOB", "description": "Seller delivers goods on board vessel"},
        {"name": "Cost and Freight", "code": "CFR", "description": "Seller pays cost and freight"},
        {"name": "Cost Insurance Freight", "code": "CIF", "description": "Seller pays cost, insurance and freight"},
        {"name": "Delivered at Place", "code": "DAP", "description": "Seller delivers at named place"}
    ]
    for inc in incoterms:
        existing = await db.incoterms.find_one({"code": inc['code']})
        if not existing:
            inc['id'] = str(uuid.uuid4())
            inc['is_active'] = True
            await db.incoterms.insert_one(inc)
    
    # UAE Ports
    ports = [
        {"name": "Jebel Ali Port", "code": "AEJEA", "country": "UAE", "city": "Dubai"},
        {"name": "Port Rashid", "code": "AEDXB", "country": "UAE", "city": "Dubai"},
        {"name": "Khalifa Port", "code": "AEKHL", "country": "UAE", "city": "Abu Dhabi"},
        {"name": "Sharjah Port", "code": "AESHJ", "country": "UAE", "city": "Sharjah"},
        {"name": "Fujairah Port", "code": "AEFUJ", "country": "UAE", "city": "Fujairah"},
        {"name": "Mundra Port", "code": "INMUN", "country": "India", "city": "Gujarat"},
        {"name": "Singapore Port", "code": "SGSIN", "country": "Singapore", "city": "Singapore"}
    ]
    for port in ports:
        existing = await db.ports.find_one({"code": port['code']})
        if not existing:
            port['id'] = str(uuid.uuid4())
            port['is_active'] = True
            await db.ports.insert_one(port)
    
    # Scrap Categories
    categories = [
        {"name": "Ferrous Metals", "code": "FE", "description": "Iron and steel scrap"},
        {"name": "Non-Ferrous Metals", "code": "NF", "description": "Copper, aluminum, brass, etc."},
        {"name": "Stainless Steel", "code": "SS", "description": "Stainless steel grades"},
        {"name": "Mixed Metals", "code": "MX", "description": "Mixed metal scrap"}
    ]
    for cat in categories:
        existing = await db.scrap_categories.find_one({"code": cat['code']})
        if not existing:
            cat['id'] = str(uuid.uuid4())
            cat['is_active'] = True
            cat['created_at'] = datetime.now(timezone.utc).isoformat()
            await db.scrap_categories.insert_one(cat)
    
    # Scrap Items
    fe_cat = await db.scrap_categories.find_one({"code": "FE"}, {"_id": 0})
    nf_cat = await db.scrap_categories.find_one({"code": "NF"}, {"_id": 0})
    ss_cat = await db.scrap_categories.find_one({"code": "SS"}, {"_id": 0})
    
    items = [
        {"name": "HMS 1&2 80/20", "code": "HMS80", "category_id": fe_cat['id'] if fe_cat else "", "grade": "1&2", "type": "Heavy Melting Scrap", "unit": "MT"},
        {"name": "HMS 1 Only", "code": "HMS1", "category_id": fe_cat['id'] if fe_cat else "", "grade": "1", "type": "Heavy Melting Scrap", "unit": "MT"},
        {"name": "Shredded Scrap", "code": "SHRED", "category_id": fe_cat['id'] if fe_cat else "", "grade": "A", "type": "Shredded", "unit": "MT"},
        {"name": "Cast Iron", "code": "CI", "category_id": fe_cat['id'] if fe_cat else "", "grade": "Standard", "type": "Cast Iron", "unit": "MT"},
        {"name": "Copper Wire Scrap", "code": "CU-WIRE", "category_id": nf_cat['id'] if nf_cat else "", "grade": "Bright", "type": "Copper Wire", "unit": "MT"},
        {"name": "Aluminum Extrusion", "code": "AL-EXT", "category_id": nf_cat['id'] if nf_cat else "", "grade": "6063", "type": "Extrusion", "unit": "MT"},
        {"name": "Brass Honey", "code": "BR-HON", "category_id": nf_cat['id'] if nf_cat else "", "grade": "Honey", "type": "Brass", "unit": "MT"},
        {"name": "SS 304 Scrap", "code": "SS304", "category_id": ss_cat['id'] if ss_cat else "", "grade": "304", "type": "Stainless Steel", "unit": "MT"},
        {"name": "SS 316 Scrap", "code": "SS316", "category_id": ss_cat['id'] if ss_cat else "", "grade": "316", "type": "Stainless Steel", "unit": "MT"}
    ]
    for item in items:
        existing = await db.scrap_items.find_one({"code": item['code']})
        if not existing:
            item['id'] = str(uuid.uuid4())
            item['is_active'] = True
            item['min_stock'] = 0
            item['created_at'] = datetime.now(timezone.utc).isoformat()
            await db.scrap_items.insert_one(item)
    
    # Chart of Accounts
    accounts = [
        {"code": "1100", "name": "Accounts Receivable", "account_type": "asset"},
        {"code": "1200", "name": "Inventory", "account_type": "asset"},
        {"code": "1300", "name": "VAT Input", "account_type": "asset"},
        {"code": "2100", "name": "Accounts Payable", "account_type": "liability"},
        {"code": "2200", "name": "Broker Payable", "account_type": "liability"},
        {"code": "2300", "name": "VAT Output", "account_type": "liability"},
        {"code": "3100", "name": "Share Capital", "account_type": "equity"},
        {"code": "3200", "name": "Retained Earnings", "account_type": "equity"},
        {"code": "4100", "name": "Sales Revenue", "account_type": "income"},
        {"code": "4200", "name": "Other Income", "account_type": "income"},
        {"code": "5100", "name": "Cost of Goods Sold", "account_type": "expense"},
        {"code": "5200", "name": "Broker Commission Expense", "account_type": "expense"},
        {"code": "5300", "name": "Freight Expense", "account_type": "expense"},
        {"code": "5400", "name": "Operating Expenses", "account_type": "expense"}
    ]
    for acc in accounts:
        existing = await db.accounts.find_one({"code": acc['code']})
        if not existing:
            acc['id'] = str(uuid.uuid4())
            acc['is_active'] = True
            acc['balance'] = 0
            await db.accounts.insert_one(acc)
    
    return {"message": "Seed data created successfully"}

# ==================== HEALTH CHECK ====================
@api_router.get("/")
async def root():
    return {"message": "ScrapOS ERP API v1.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_scheduler():
    """Initialize scheduler on startup"""
    scheduler.start()
    # Load existing schedule from database
    settings = await db.system_settings.find_one({"type": "backup_schedule"}, {"_id": 0})
    if settings and settings.get("enabled"):
        schedule_backup_job(settings.get("frequency", "daily"), settings.get("time", "02:00"))
    logger.info("Scheduler initialized")

@app.on_event("shutdown")
async def shutdown_db_client():
    scheduler.shutdown(wait=False)
    client.close()
