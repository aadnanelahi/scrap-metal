# ScrapOS - Commercial Scrap Metal ERP

## Overview
Production-ready, commercial ERP system for Scrap Metal Trading Companies. UAE-first but multi-country capable. Designed for both internal use and SaaS resale.

## Architecture
- **Frontend**: React 18 with Tailwind CSS, Shadcn/UI components
- **Backend**: FastAPI (Python) with async MongoDB
- **Database**: MongoDB with proper collections for each entity
- **Authentication**: JWT-based with bcrypt password hashing
- **Theme**: Dark/Light mode with theme toggle
- **Scheduling**: APScheduler for automated tasks (backups)

## Implemented Features (v1.0) - February 2026

### ✅ Auth & Security
- User registration with role selection
- JWT-based login/logout
- Role-based access control (Admin, Manager, Accountant, Weighbridge Operator, Sales, Purchase, Viewer)
- Audit logging (who did what & when)
- Admin-only user management (password reset, delete user)

### ✅ Master Data
- Companies CRUD (with **Logo upload** and **Slogan/Tagline** support)
- Branches/Yards CRUD
- Customers CRUD (Local & International segregation)
- Suppliers CRUD (Local & International segregation)
- Brokers CRUD with commission configuration
- Scrap Categories
- Scrap Items (Grade, Type, Unit)
- VAT Codes (UAE 5% standard, 0% zero-rated, exempt)
- Currencies with exchange rates
- Payment Terms
- Incoterms
- Ports (UAE & international)
- Weighbridges

### ✅ Weighbridge Module
- First Weight (Gross) entry
- Second Weight (Tare) recording
- Net Weight auto-calculation
- Weight slip number generation (WB-YYYYMM-XXXX)
- Lock functionality after posting
- Vehicle & driver tracking
- Print weighbridge slips

### ✅ Purchase Modules (Fully Segregated)
- **Local Purchases**: PO creation, VAT calculation, broker commission, inventory update, accounting posting
- **International Purchases**: Multi-currency, landed cost, shipping details, incoterms
- Print Purchase Orders
- Purchase Order Detail View

### ✅ Sales Modules (Fully Segregated)
- **Local Sales**: SO creation, VAT calculation, broker commission, inventory reduction, COGS calculation
- **Export Sales**: Zero-rated VAT, incoterms, container details, multi-currency
- Print Sales Orders
- Sales Order Detail View

### ✅ Inventory Module
- Real-time stock by Item & Yard
- FIFO valuation
- Stock movement ledger
- Average cost tracking

### ✅ Finance & Accounting
- Chart of Accounts (pre-seeded)
- Automatic journal entry creation on posting
- VAT Input/Output tracking
- Payments Page - Receipts from customers & payments to suppliers
- Payment Receipt Printing
- **Trial Balance Report** ✨ NEW (Feb 2026)

### ✅ Reports
- Purchase Register (Local & Intl separate)
- Sales Register (Local & Export separate)
- VAT Report (UAE FTA format)
- Stock Aging
- Broker Commission Report
- Customer Ledger
- Supplier Ledger
- **Trial Balance** ✨ NEW - Shows all account balances with debit/credit totals
- PDF/Excel Export - All reports exportable

### ✅ Admin Features
- User management (admin can reset passwords, delete users)
- Audit logs
- **Data Management** (Admin only)
  - Complete database backup (JSON export)
  - Restore from backup file
  - Reset system data with options to preserve users/master data
  - Database statistics view
  - **Scheduled Backups** ✨ NEW (Feb 2026)
    - Daily/Weekly/Monthly automatic backups
    - APScheduler-based scheduling
    - Server-side backup files (/app/backend/backups/)
    - Backup history with record counts
    - Run Now manual trigger

### ✅ Dashboard
- KPIs: Total Purchases, Sales, Gross Margin, Inventory Value
- Weighbridge entries today
- Pending documents summary
- Top inventory items chart
- Quick action links
- **Date Filters**: Today, This Week, Monthly, Custom date range

### ✅ Role-Based Access
- Admin-only access to Users and Companies modules
- Non-admin users see restricted sidebar menu

### ✅ Custom Branding
- TechSight Innovation branding on login page and sidebar

## Recent Changes (March 10, 2026)

### Bug Fix ✅ - Currency Conversion in Financial Reports
- **Fixed currency conversion bug in all financial reports**
  - Foreign currency transactions (e.g., USD) now correctly convert to base currency (AED)
  - All journal entries created from PO/SO posting now store amounts in AED
  - Receivables and Payables reports show `invoice_amount_aed`, `balance_aed`, `paid_amount_aed` fields
  - Frontend displays AED amounts with original currency shown in smaller text for reference
- **Affected areas fixed**:
  - `create_purchase_journal_entry()` - converts international purchase amounts to AED
  - `create_sales_journal_entry()` - converts export sale amounts to AED
  - `get_receivables_report()` - returns AED-converted totals
  - `get_payables_report()` - returns AED-converted totals for international purchases
  - `ReceivablesPage.js` - displays AED amounts with original currency reference
  - `PayablesPage.js` - displays AED amounts with original currency reference

### New Feature ✅ - Accounting Settings Page (Phase 3)
- **Accounting Settings page at `/accounting/settings`**
  - **Fiscal Year Configuration**: Start date dropdown (Jan/Apr/Jul/Oct), auto-calculated end date, current fiscal year selector
  - **Period Lock**: Toggle to enable period locking, date picker for lock date, warning message
  - **Default Accounts**: Dropdowns to set default Cash, Bank, Receivable, Payable, Sales, COGS, and Inventory accounts
  - **Base Currency**: Selector for base reporting currency (AED, USD, EUR, GBP, SAR)
  - Save button to persist all settings

### New Feature ✅ - Print Vouchers for Expenses and Income
- **Expense Voucher Printing**: Print icon in Actions column for each expense entry
  - Professional voucher format with header, account details, debit/credit breakdown
  - Signature lines for Prepared By, Approved By, Received By
- **Income Receipt Voucher Printing**: Print icon in Actions column for each income entry
  - Professional receipt format with income account, payment method, amounts
  - Signature lines for Prepared By, Approved By, Paid By

## Recent Changes (March 9, 2026)

### New Features ✅ - Accounting Module Phase 2
- **Automatic Journal Entry on PO/SO Posting**: When Purchase Orders or Sales Orders are posted, automatic journal entries are created in the `accounting_journal_entries` collection
  - Purchase posting creates: Debit Inventory, Debit VAT Input, Credit Accounts Payable
  - Sales posting creates: Debit Accounts Receivable, Credit Sales Revenue, Credit VAT Output, Debit COGS, Credit Inventory
- **Accounts Receivable Report**: New page showing outstanding customer invoices with aging analysis (Current, 1-30, 31-60, 61-90, 90+ days)
- **Accounts Payable Report**: New page showing outstanding supplier bills with aging analysis
- **Both reports support**:
  - As-of-date filtering
  - Print functionality
  - Aging buckets with color coding

### API Endpoints Added
- `GET /api/accounting/reports/receivables` - Receivables aging report
- `GET /api/accounting/reports/payables` - Payables aging report

## Recent Changes (February 25, 2026)

### Bug Fix ✅
- **Fixed Local PO/SO Creation Error**: Added frontend validation to check that line items have required fields (Item, Quantity, Unit Price) before submitting. Previously, users could add empty line items which caused a generic "Failed to create" error. Now shows clear validation message.

### New Features ✅ - Accounting Module Phase 1
- **Chart of Accounts (COA)**: Full CRUD operations with 74 default accounts in hierarchical structure
  - Assets, Liabilities, Equity, Income, COGS, and Expense categories
  - Parent-child account relationships with indented tree view
  - Filter by account type
  - Account balance tracking
- **Expense Management**: Record expenses with automatic journal entry generation
  - Payment method support (Cash, Bank, Credit)
  - Links to expense accounts
- **Income Entry**: Manual income recording with auto journal entries
  - Payment method support
  - Links to income accounts  
- **Journal Entries**: View all accounting journal entries with balanced debit/credit
  - Entry reversal support
  - Posted status tracking
- **Profit & Loss Statement**: Date-filtered P&L report
  - Income, COGS, Gross Profit, Operating Expenses, Net Profit sections
  - Print report functionality
- **Balance Sheet**: Point-in-time financial position report
  - Assets, Liabilities, Equity sections
  - Balance warning when Assets ≠ Liabilities + Equity
  - Print report functionality

### API Endpoints Added (Accounting Module)
- `GET/POST /api/accounting/chart-of-accounts` - COA CRUD
- `GET/PUT/DELETE /api/accounting/chart-of-accounts/{id}` - Account operations
- `POST /api/accounting/initialize-coa` - Initialize default COA
- `GET/POST /api/accounting/expenses` - Expense management
- `GET/POST /api/accounting/income` - Income management  
- `GET/POST /api/accounting/journal-entries` - Journal entries
- `POST /api/accounting/journal-entries/{id}/reverse` - Reverse entry
- `GET /api/accounting/reports/profit-loss` - P&L report
- `GET /api/accounting/reports/balance-sheet` - Balance sheet report

### Previous Changes (February 23, 2026)

### New Features ✅
- **Trial Balance Report**: Shows all account balances with debit/credit totals, balanced status indicator, and PDF/Excel export
- **Scheduled Backups**: APScheduler-based automated backups with daily/weekly/monthly frequency, server-side storage, backup history, and manual "Run Now" trigger

### API Endpoints Added
- `GET /api/reports/trial-balance` - Generate trial balance report with date filter
- `GET /api/admin/backup-schedule` - Get backup schedule settings and history
- `POST /api/admin/backup-schedule` - Save backup schedule (enable/disable, frequency, time)
- `POST /api/admin/backup-now` - Trigger immediate backup

## Prioritized Backlog

### P0 - Critical (Completed ✅)
- [x] Fix transaction form crashes with empty data
- [x] Add print functionality for documents
- [x] International Purchase Order form (with landed cost)
- [x] Export Sales Contract form (with zero-rated VAT)
- [x] PDF/Excel export for all reports
- [x] Payment Receipt printing
- [x] Customer/Supplier ledger reports
- [x] Document cancellation/reversal flow
- [x] Trial Balance Report
- [x] Scheduled Backups
- [x] **Accounting Module Phase 1** - Chart of Accounts, Expenses, Income, Journal Entries, P&L, Balance Sheet
- [x] **Accounting Module Phase 2** - Integrate Purchase/Sales with accounting (auto journal entries on posting)
- [x] **Currency Conversion Bug Fix** - All financial reports now correctly convert foreign currency to AED
- [x] **Accounting Module Phase 3** - Accounting Settings page (fiscal year, default accounts, period lock)
- [x] **Print Vouchers** - Print functionality for Expense and Income vouchers

### P0 - In Progress
- [ ] **Accounting Module Phase 4** - Role-based permissions for finance operations
- [ ] **Accounting Module Phase 5** - Data migration script for existing companies

### P1 - High Priority (Next Sprint)
- [ ] Windows Installer Package (using Inno Setup instead of PowerShell)
- [ ] Add international suppliers/customers to seed data
- [ ] Weighbridge hardware API integration placeholder
- [ ] Currency revaluation
- [ ] Bank reconciliation

### P2 - Medium Priority
- [ ] Break down server.py into modular routers (refactoring)
- [ ] SaaS multi-tenancy architecture
- [ ] Remove deprecated `journal_entries` collection

### P3 - Low Priority
- [ ] Dashboard monthly charts with real data
- [ ] Container/BL tracking for exports
- [ ] AI-powered insights (architecture ready)
- [ ] Email notifications

## Deployment Package (February 2026) ✅ v2.1 OFFLINE

### Self-Installing OFFLINE Package
- **Download URL**: `https://erp-accounting-fix-3.preview.emergentagent.com/scrapos-erp-offline.tar.gz`
- **Package Size**: ~2.9MB (includes all fonts and latest features)
- **Target OS**: Ubuntu 22.04 / 24.04 LTS
- **Version**: 2.1 (with Trial Balance & Scheduled Backups)

### Installation Script Features
- Fully automated installation (no manual steps)
- Installs all dependencies: Node.js 20, Python 3, MongoDB 8.0, PM2
- Creates Python virtual environment with APScheduler
- Automatically creates .env files
- Generates secure JWT secret
- Configures firewall (UFW)
- Sets up PM2 process manager
- Creates default admin user
- Seeds sample data

### Default Credentials After Install
- **Email**: admin@scrapos.local
- **Password**: Admin@123

## Technical Stack
- MongoDB for flexible document schema
- JWT with 24h expiration
- APScheduler for scheduled tasks
- FastAPI async routes
- All monetary values in base currency (AED) with conversion
- UTC timestamps throughout

## Test Credentials (Preview Environment)
- **Admin**: admin@scrapos.ae / password
- **Viewer**: viewer@test.com / password
