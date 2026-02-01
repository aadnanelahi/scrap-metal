import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/Layout';
import { Toaster } from './components/ui/sonner';
import { Loader2 } from 'lucide-react';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Main Pages
import DashboardPage from './pages/DashboardPage';
import WeighbridgePage from './pages/weighbridge/WeighbridgePage';
import InventoryPage from './pages/inventory/InventoryPage';

// Purchases
import LocalPurchasesPage from './pages/purchases/LocalPurchasesPage';
import NewLocalPurchasePage from './pages/purchases/NewLocalPurchasePage';
import LocalPurchaseDetailPage from './pages/purchases/LocalPurchaseDetailPage';
import IntlPurchasesPage from './pages/purchases/IntlPurchasesPage';
import NewIntlPurchasePage from './pages/purchases/NewIntlPurchasePage';

// Sales
import LocalSalesPage from './pages/sales/LocalSalesPage';
import NewLocalSalePage from './pages/sales/NewLocalSalePage';
import LocalSaleDetailPage from './pages/sales/LocalSaleDetailPage';
import ExportSalesPage from './pages/sales/ExportSalesPage';
import NewExportSalePage from './pages/sales/NewExportSalePage';

// Master Data
import CompaniesPage from './pages/master/CompaniesPage';
import BranchesPage from './pages/master/BranchesPage';
import CustomersPage from './pages/master/CustomersPage';
import SuppliersPage from './pages/master/SuppliersPage';
import BrokersPage from './pages/master/BrokersPage';
import ScrapItemsPage from './pages/master/ScrapItemsPage';
import VATCodesPage from './pages/master/VATCodesPage';
import CurrenciesPage from './pages/master/CurrenciesPage';
import PortsPage from './pages/master/PortsPage';
import WeighbridgesMasterPage from './pages/master/WeighbridgesMasterPage';

// Finance
import AccountsPage from './pages/finance/AccountsPage';
import JournalEntriesPage from './pages/finance/JournalEntriesPage';
import PaymentsPage from './pages/finance/PaymentsPage';

// Reports
import PurchaseRegisterPage from './pages/reports/PurchaseRegisterPage';
import SalesRegisterPage from './pages/reports/SalesRegisterPage';
import VATReportPage from './pages/reports/VATReportPage';
import StockAgingPage from './pages/reports/StockAgingPage';
import BrokerCommissionPage from './pages/reports/BrokerCommissionPage';
import PartyLedgerPage from './pages/reports/PartyLedgerPage';

// Admin
import UsersPage from './pages/users/UsersPage';
import AuditLogsPage from './pages/audit/AuditLogsPage';
import DataManagementPage from './pages/admin/DataManagementPage';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      {/* Protected Routes */}
      <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/weighbridge" element={<ProtectedRoute><WeighbridgePage /></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />

      {/* Purchases */}
      <Route path="/local-purchases" element={<ProtectedRoute><LocalPurchasesPage /></ProtectedRoute>} />
      <Route path="/local-purchases/new" element={<ProtectedRoute><NewLocalPurchasePage /></ProtectedRoute>} />
      <Route path="/local-purchases/:id" element={<ProtectedRoute><LocalPurchaseDetailPage /></ProtectedRoute>} />
      <Route path="/intl-purchases" element={<ProtectedRoute><IntlPurchasesPage /></ProtectedRoute>} />
      <Route path="/intl-purchases/new" element={<ProtectedRoute><NewIntlPurchasePage /></ProtectedRoute>} />

      {/* Sales */}
      <Route path="/local-sales" element={<ProtectedRoute><LocalSalesPage /></ProtectedRoute>} />
      <Route path="/local-sales/new" element={<ProtectedRoute><NewLocalSalePage /></ProtectedRoute>} />
      <Route path="/local-sales/:id" element={<ProtectedRoute><LocalSaleDetailPage /></ProtectedRoute>} />
      <Route path="/export-sales" element={<ProtectedRoute><ExportSalesPage /></ProtectedRoute>} />
      <Route path="/export-sales/new" element={<ProtectedRoute><NewExportSalePage /></ProtectedRoute>} />

      {/* Master Data */}
      <Route path="/companies" element={<ProtectedRoute><CompaniesPage /></ProtectedRoute>} />
      <Route path="/branches" element={<ProtectedRoute><BranchesPage /></ProtectedRoute>} />
      <Route path="/customers" element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
      <Route path="/suppliers" element={<ProtectedRoute><SuppliersPage /></ProtectedRoute>} />
      <Route path="/brokers" element={<ProtectedRoute><BrokersPage /></ProtectedRoute>} />
      <Route path="/scrap-items" element={<ProtectedRoute><ScrapItemsPage /></ProtectedRoute>} />
      <Route path="/vat-codes" element={<ProtectedRoute><VATCodesPage /></ProtectedRoute>} />
      <Route path="/currencies" element={<ProtectedRoute><CurrenciesPage /></ProtectedRoute>} />
      <Route path="/ports" element={<ProtectedRoute><PortsPage /></ProtectedRoute>} />
      <Route path="/weighbridges-master" element={<ProtectedRoute><WeighbridgesMasterPage /></ProtectedRoute>} />

      {/* Finance */}
      <Route path="/accounts" element={<ProtectedRoute><AccountsPage /></ProtectedRoute>} />
      <Route path="/journal-entries" element={<ProtectedRoute><JournalEntriesPage /></ProtectedRoute>} />
      <Route path="/payments" element={<ProtectedRoute><PaymentsPage /></ProtectedRoute>} />

      {/* Reports */}
      <Route path="/reports/purchases" element={<ProtectedRoute><PurchaseRegisterPage /></ProtectedRoute>} />
      <Route path="/reports/sales" element={<ProtectedRoute><SalesRegisterPage /></ProtectedRoute>} />
      <Route path="/reports/vat" element={<ProtectedRoute><VATReportPage /></ProtectedRoute>} />
      <Route path="/reports/stock-aging" element={<ProtectedRoute><StockAgingPage /></ProtectedRoute>} />
      <Route path="/reports/broker-commission" element={<ProtectedRoute><BrokerCommissionPage /></ProtectedRoute>} />
      <Route path="/reports/party-ledger" element={<ProtectedRoute><PartyLedgerPage /></ProtectedRoute>} />

      {/* Admin */}
      <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
      <Route path="/audit-logs" element={<ProtectedRoute><AuditLogsPage /></ProtectedRoute>} />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
