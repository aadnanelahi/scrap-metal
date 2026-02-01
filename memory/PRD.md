# ScrapOS - Commercial Scrap Metal ERP

## Overview
Production-ready, commercial ERP system for Scrap Metal Trading Companies. UAE-first but multi-country capable. Designed for both internal use and SaaS resale.

## Architecture
- **Frontend**: React 18 with Tailwind CSS, Shadcn/UI components
- **Backend**: FastAPI (Python) with async MongoDB
- **Database**: MongoDB with proper collections for each entity
- **Authentication**: JWT-based with bcrypt password hashing
- **Theme**: Dark/Light mode with theme toggle

## Implemented Features (v1.0) - February 2026

### ✅ Auth & Security
- User registration with role selection
- JWT-based login/logout
- Role-based access control (Admin, Manager, Accountant, Weighbridge Operator, Sales, Purchase, Viewer)
- Audit logging (who did what & when)

### ✅ Master Data
- Companies CRUD
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
- **Print weighbridge slips** ✨ NEW

### ✅ Purchase Modules (Fully Segregated)
- **Local Purchases**: PO creation, VAT calculation, broker commission, inventory update, accounting posting
- **International Purchases**: Multi-currency, landed cost, no VAT
- **Print Purchase Orders** ✨ NEW
- **Purchase Order Detail View** ✨ NEW

### ✅ Sales Modules (Fully Segregated)
- **Local Sales**: SO creation, VAT calculation, broker commission, inventory reduction, COGS calculation
- **Export Sales**: Zero-rated VAT, incoterms, container details
- **Print Sales Orders** ✨ NEW
- **Sales Order Detail View** ✨ NEW

### ✅ Inventory Module
- Real-time stock by Item & Yard
- FIFO valuation
- Stock movement ledger
- Average cost tracking

### ✅ Finance & Accounting
- Chart of Accounts (pre-seeded)
- Automatic journal entry creation on posting
- VAT Input/Output tracking

### ✅ Reports
- Purchase Register (Local & Intl separate)
- Sales Register (Local & Export separate)
- VAT Report (UAE FTA format)
- Stock Aging
- Broker Commission Report

### ✅ Dashboard
- KPIs: Total Purchases, Sales, Gross Margin, Inventory Value
- Weighbridge entries today
- Pending documents summary
- Top inventory items chart
- Quick action links

### ✅ UAE Seed Data
- UAE VAT codes (5%, 0%, Exempt)
- Currencies (AED, USD, EUR, INR)
- Payment Terms (Cash, Net 15/30/60)
- Incoterms (EXW, FOB, CFR, CIF, DAP)
- UAE & International Ports
- Scrap Categories (Ferrous, Non-Ferrous, Stainless, Mixed)
- Common Scrap Items (HMS, Shredded, Copper, Aluminum, Brass, SS304/316)
- Chart of Accounts

## User Personas
1. **Admin**: Full system access, user management, seed data
2. **Manager**: All operations, reports, approvals
3. **Accountant**: Finance, VAT reports, journal entries
4. **Weighbridge Operator**: Weighbridge entry only
5. **Sales**: Sales orders, customers
6. **Purchase**: Purchase orders, suppliers
7. **Viewer**: Read-only access

## Core Requirements (Static)
- Local & International must remain fully segregated
- Weighbridge is source of truth for weight
- Posted documents cannot be edited (cancel via reversal)
- VAT amounts locked after invoice
- Multi-company & multi-branch ready
- SaaS-ready tenant separation architecture

## Recent Changes (February 2026)

### Bug Fixes ✅
- **P0 Fixed**: Transaction creation forms no longer crash when master data is empty
- Forms now show helpful "Master Data Required" message instead of crashing
- Weighbridge page handles empty branches/weighbridges gracefully

### New Features ✅
- **Document Printing**: Print functionality for all documents (PO, SO, Weighbridge Slips)
- **Detail Pages**: View Purchase Order and Sales Order details with print option
- **Print Templates**: Professional print layout with company header, signatures

## Prioritized Backlog

### P0 - Critical (Completed ✅)
- [x] Fix transaction form crashes with empty data
- [x] Add print functionality for documents

### P1 - High Priority (Next Sprint)
- [ ] PDF/Excel export for all reports
- [ ] Complete International Purchase form UI
- [ ] Complete Export Sales form UI
- [ ] Payment Receipt printing
- [ ] Weighbridge hardware API integration placeholder

### P2 - Medium Priority
- [ ] Document cancellation/reversal flow
- [ ] Customer/Supplier ledger reports
- [ ] Trial balance report
- [ ] Currency revaluation

### P3 - Low Priority
- [ ] Dashboard monthly charts with real data
- [ ] Container/BL tracking for exports
- [ ] AI-powered insights (architecture ready)
- [ ] Email notifications
- [ ] Multi-tenant SaaS mode

## Technical Decisions
- MongoDB for flexible document schema
- JWT with 24h expiration
- CORS configured for all origins (configure for production)
- All monetary values in base currency (AED) with conversion
- UTC timestamps throughout

## API Endpoints Summary
- `/api/auth/*` - Authentication
- `/api/users/*` - User management
- `/api/companies/*`, `/api/branches/*`, etc. - Master data
- `/api/weighbridge-entries/*` - Weighbridge operations
- `/api/local-purchases/*`, `/api/intl-purchases/*` - Purchases
- `/api/local-sales/*`, `/api/export-sales/*` - Sales
- `/api/inventory/*` - Stock & movements
- `/api/accounts/*`, `/api/journal-entries/*` - Finance
- `/api/reports/*` - All reports
- `/api/dashboard/*` - Dashboard KPIs
- `/api/audit-logs` - Audit trail

## Next Action Items
1. Implement PDF/Excel export using jsPDF and xlsx libraries
2. Build International Purchase and Export Sales form UIs
3. Add document reversal functionality
4. Implement customer/supplier aging reports
