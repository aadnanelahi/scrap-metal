import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI, seedDataAPI, inventoryAPI } from '../lib/api';
import { formatCurrency, formatNumber } from '../lib/utils';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import {
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  FileText,
  Scale,
  AlertCircle,
  Database,
  Loader2,
  ArrowRight,
  ShoppingCart,
  Truck
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function DashboardPage() {
  const [kpis, setKpis] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [kpiRes, invRes] = await Promise.all([
        dashboardAPI.kpis(),
        inventoryAPI.stock()
      ]);
      setKpis(kpiRes.data);
      setInventory(invRes.data);
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      await seedDataAPI.seed();
      toast.success('Seed data created successfully');
      loadData();
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to seed data';
      toast.error(message);
    } finally {
      setSeeding(false);
    }
  };

  const COLORS = ['#f97316', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

  const chartData = [
    { name: 'Local Purchase', value: kpis?.pending_documents?.local_purchase || 0 },
    { name: 'Intl Purchase', value: kpis?.pending_documents?.intl_purchase || 0 },
    { name: 'Local Sales', value: kpis?.pending_documents?.local_sales || 0 },
    { name: 'Export Sales', value: kpis?.pending_documents?.export_sales || 0 },
  ];

  const inventoryChartData = inventory.slice(0, 5).map(item => ({
    name: item.item_name?.substring(0, 12) || 'Unknown',
    quantity: item.quantity || 0,
    value: item.total_value || 0
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Overview of your scrap trading operations
          </p>
        </div>
        <Button
          onClick={handleSeedData}
          disabled={seeding}
          variant="outline"
          className="gap-2"
          data-testid="seed-data-btn"
        >
          {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
          Load Sample Data
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kpi-card" data-testid="kpi-purchases">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Purchases
              </p>
              <p className="text-2xl font-mono font-bold text-slate-900 dark:text-white mt-2">
                {formatCurrency(kpis?.total_purchases || 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-sm flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="kpi-card" data-testid="kpi-sales">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Sales
              </p>
              <p className="text-2xl font-mono font-bold text-slate-900 dark:text-white mt-2">
                {formatCurrency(kpis?.total_sales || 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-sm flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="kpi-card" data-testid="kpi-margin">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Gross Margin
              </p>
              <p className="text-2xl font-mono font-bold text-slate-900 dark:text-white mt-2">
                {formatCurrency(kpis?.gross_margin || 0)}
              </p>
              <p className={`text-sm mt-1 flex items-center gap-1 ${
                (kpis?.margin_percentage || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {(kpis?.margin_percentage || 0) >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {formatNumber(kpis?.margin_percentage || 0)}%
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-sm flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>

        <div className="kpi-card" data-testid="kpi-inventory">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Inventory Value
              </p>
              <p className="text-2xl font-mono font-bold text-slate-900 dark:text-white mt-2">
                {formatCurrency(kpis?.inventory_value || 0)}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {formatNumber(kpis?.inventory_qty || 0)} MT
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-sm flex items-center justify-center">
              <Package className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="kpi-card" data-testid="kpi-weighbridge">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-sm flex items-center justify-center">
              <Scale className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Weighbridge Today
              </p>
              <p className="text-2xl font-mono font-bold text-slate-900 dark:text-white">
                {kpis?.weighbridge_entries_today || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="kpi-card col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                Pending Documents
              </p>
              <div className="flex gap-6">
                <div>
                  <p className="text-lg font-mono font-bold text-slate-900 dark:text-white">
                    {kpis?.pending_documents?.local_purchase || 0}
                  </p>
                  <p className="text-xs text-slate-500">Local PO</p>
                </div>
                <div>
                  <p className="text-lg font-mono font-bold text-slate-900 dark:text-white">
                    {kpis?.pending_documents?.intl_purchase || 0}
                  </p>
                  <p className="text-xs text-slate-500">Intl PO</p>
                </div>
                <div>
                  <p className="text-lg font-mono font-bold text-slate-900 dark:text-white">
                    {kpis?.pending_documents?.local_sales || 0}
                  </p>
                  <p className="text-xs text-slate-500">Local SO</p>
                </div>
                <div>
                  <p className="text-lg font-mono font-bold text-slate-900 dark:text-white">
                    {kpis?.pending_documents?.export_sales || 0}
                  </p>
                  <p className="text-xs text-slate-500">Export</p>
                </div>
              </div>
            </div>
            <FileText className="w-8 h-8 text-slate-300 dark:text-slate-700" />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory Chart */}
        <div className="kpi-card">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
            Top Inventory Items (by Quantity)
          </h3>
          {inventoryChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={inventoryChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => formatNumber(value) + ' MT'}
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '4px'
                  }}
                />
                <Bar dataKey="quantity" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-slate-400">
              <div className="text-center">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No inventory data yet</p>
              </div>
            </div>
          )}
        </div>

        {/* Pending Documents Pie */}
        <div className="kpi-card">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
            Pending Documents Distribution
          </h3>
          {chartData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-slate-400">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No pending documents</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="kpi-card">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/weighbridge"
            className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            data-testid="quick-action-weighbridge"
          >
            <Scale className="w-5 h-5 text-orange-500" />
            <span className="font-medium text-sm">Weighbridge Entry</span>
            <ArrowRight className="w-4 h-4 ml-auto text-slate-400" />
          </Link>
          <Link
            to="/local-purchases/new"
            className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            data-testid="quick-action-local-po"
          >
            <ShoppingCart className="w-5 h-5 text-blue-500" />
            <span className="font-medium text-sm">Local Purchase</span>
            <ArrowRight className="w-4 h-4 ml-auto text-slate-400" />
          </Link>
          <Link
            to="/local-sales/new"
            className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            data-testid="quick-action-local-so"
          >
            <Truck className="w-5 h-5 text-emerald-500" />
            <span className="font-medium text-sm">Local Sale</span>
            <ArrowRight className="w-4 h-4 ml-auto text-slate-400" />
          </Link>
          <Link
            to="/inventory"
            className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            data-testid="quick-action-inventory"
          >
            <Package className="w-5 h-5 text-purple-500" />
            <span className="font-medium text-sm">View Inventory</span>
            <ArrowRight className="w-4 h-4 ml-auto text-slate-400" />
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {(inventory.some(i => i.quantity <= 0) || (kpis?.pending_documents && Object.values(kpis.pending_documents).some(v => v > 5))) && (
        <div className="kpi-card border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800 dark:text-amber-300">Alerts</h3>
              <ul className="mt-2 space-y-1 text-sm text-amber-700 dark:text-amber-400">
                {inventory.some(i => i.quantity <= 0) && (
                  <li>• Some items have zero or negative stock</li>
                )}
                {kpis?.pending_documents && Object.values(kpis.pending_documents).some(v => v > 5) && (
                  <li>• You have more than 5 pending documents to review</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
