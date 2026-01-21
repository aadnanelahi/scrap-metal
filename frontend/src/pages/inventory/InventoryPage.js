import { useState, useEffect } from 'react';
import { inventoryAPI, branchesAPI, scrapItemsAPI } from '../../lib/api';
import { formatCurrency, formatNumber, formatDateTime } from '../../lib/utils';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { Package, ArrowUpCircle, ArrowDownCircle, Loader2 } from 'lucide-react';

export default function InventoryPage() {
  const [stock, setStock] = useState([]);
  const [movements, setMovements] = useState([]);
  const [branches, setBranches] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    branch_id: '',
    item_id: ''
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadInventoryData();
  }, [filters]);

  const loadInitialData = async () => {
    try {
      const [branchRes, itemRes] = await Promise.all([
        branchesAPI.list(),
        scrapItemsAPI.list()
      ]);
      setBranches(branchRes.data);
      setItems(itemRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    }
  };

  const loadInventoryData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.branch_id) params.branch_id = filters.branch_id;
      if (filters.item_id) params.item_id = filters.item_id;

      const [stockRes, movRes] = await Promise.all([
        inventoryAPI.stock(params),
        inventoryAPI.movements(params)
      ]);
      setStock(stockRes.data);
      setMovements(movRes.data);
    } catch (error) {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const totalValue = stock.reduce((sum, s) => sum + (s.total_value || 0), 0);
  const totalQty = stock.reduce((sum, s) => sum + (s.quantity || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="inventory-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white">
            Inventory
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Stock levels and movement history
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="kpi-card flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-sm flex items-center justify-center">
            <Package className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Items</p>
            <p className="text-2xl font-mono font-bold">{stock.length}</p>
          </div>
        </div>
        <div className="kpi-card flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-sm flex items-center justify-center">
            <Package className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Quantity</p>
            <p className="text-2xl font-mono font-bold">{formatNumber(totalQty)} MT</p>
          </div>
        </div>
        <div className="kpi-card flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-sm flex items-center justify-center">
            <Package className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Value</p>
            <p className="text-2xl font-mono font-bold">{formatCurrency(totalValue)}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="kpi-card">
        <div className="flex gap-4">
          <div className="w-48">
            <Select
              value={filters.branch_id}
              onValueChange={(value) => setFilters({ ...filters, branch_id: value })}
            >
              <SelectTrigger data-testid="inventory-branch-filter">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-48">
            <Select
              value={filters.item_id}
              onValueChange={(value) => setFilters({ ...filters, item_id: value })}
            >
              <SelectTrigger data-testid="inventory-item-filter">
                <SelectValue placeholder="All Items" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Items</SelectItem>
                {items.map((i) => (
                  <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock" data-testid="tab-stock">Stock Levels</TabsTrigger>
          <TabsTrigger value="movements" data-testid="tab-movements">Movement History</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="mt-4">
          <div className="kpi-card p-0 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              </div>
            ) : (
              <table className="erp-table" data-testid="stock-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Branch / Yard</th>
                    <th className="text-right">Quantity (MT)</th>
                    <th className="text-right">Avg Cost</th>
                    <th className="text-right">Total Value</th>
                    <th>Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No inventory data</p>
                      </td>
                    </tr>
                  ) : (
                    stock.map((s) => (
                      <tr key={s.id} data-testid={`stock-row-${s.id}`}>
                        <td className="font-medium">{s.item_name}</td>
                        <td>{s.branch_name}</td>
                        <td className="text-right font-mono font-bold">
                          <span className={s.quantity <= 0 ? 'text-red-600' : ''}>
                            {formatNumber(s.quantity, 3)}
                          </span>
                        </td>
                        <td className="text-right font-mono">{formatCurrency(s.avg_cost)}</td>
                        <td className="text-right font-mono font-bold">{formatCurrency(s.total_value)}</td>
                        <td className="text-slate-500 text-sm">{formatDateTime(s.last_updated)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="movements" className="mt-4">
          <div className="kpi-card p-0 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              </div>
            ) : (
              <table className="erp-table" data-testid="movements-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Reference</th>
                    <th className="text-right">Qty (MT)</th>
                    <th className="text-right">Unit Cost</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No movement history</p>
                      </td>
                    </tr>
                  ) : (
                    movements.map((m) => (
                      <tr key={m.id} data-testid={`movement-row-${m.id}`}>
                        <td className="text-sm">{formatDateTime(m.created_at)}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            {m.movement_type === 'IN' ? (
                              <ArrowDownCircle className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <ArrowUpCircle className="w-4 h-4 text-red-500" />
                            )}
                            <Badge className={m.movement_type === 'IN' ? 'status-active' : 'status-cancelled'}>
                              {m.movement_type}
                            </Badge>
                          </div>
                        </td>
                        <td>
                          <span className="font-mono text-sm">{m.reference_number}</span>
                          <span className="text-xs text-slate-400 ml-2">({m.reference_type})</span>
                        </td>
                        <td className="text-right font-mono">{formatNumber(m.quantity, 3)}</td>
                        <td className="text-right font-mono">{formatCurrency(m.unit_cost)}</td>
                        <td className="text-right font-mono">{formatCurrency(m.total_cost)}</td>
                        <td className="text-right font-mono font-bold">{formatNumber(m.balance_qty, 3)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
