import { useState, useEffect } from 'react';
import { reportsAPI } from '../../lib/api';
import { formatCurrency, formatNumber, formatDateTime } from '../../lib/utils';
import { toast } from 'sonner';
import { Package, Loader2 } from 'lucide-react';

export default function StockAgingPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try { const res = await reportsAPI.stockAging(); setData(res.data); } catch (error) { toast.error('Failed to load report'); } finally { setLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  const totalQty = (data?.stock || []).reduce((sum, s) => sum + (s.quantity || 0), 0);
  const totalValue = (data?.stock || []).reduce((sum, s) => sum + (s.total_value || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="stock-aging-page">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white">Stock Aging Report</h1><p className="text-slate-600 dark:text-slate-400 mt-1">Current inventory with aging</p></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="kpi-card"><p className="text-xs font-bold uppercase text-slate-500">Items</p><p className="text-2xl font-mono font-bold">{(data?.stock || []).length}</p></div>
        <div className="kpi-card"><p className="text-xs font-bold uppercase text-slate-500">Total Quantity</p><p className="text-2xl font-mono font-bold">{formatNumber(totalQty)} MT</p></div>
        <div className="kpi-card"><p className="text-xs font-bold uppercase text-slate-500">Total Value</p><p className="text-2xl font-mono font-bold">{formatCurrency(totalValue)}</p></div>
      </div>
      <div className="kpi-card p-0 overflow-hidden">
        <table className="erp-table" data-testid="stock-aging-table">
          <thead><tr><th>Item</th><th>Branch</th><th className="text-right">Quantity (MT)</th><th className="text-right">Avg Cost</th><th className="text-right">Total Value</th><th>Last Updated</th></tr></thead>
          <tbody>
            {(data?.stock || []).length === 0 ? (<tr><td colSpan={6} className="text-center py-12 text-slate-400"><Package className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>No stock data</p></td></tr>) : (
              (data?.stock || []).map((s, i) => (
                <tr key={i}>
                  <td className="font-medium">{s.item_name}</td>
                  <td>{s.branch_name}</td>
                  <td className="text-right font-mono">{formatNumber(s.quantity, 3)}</td>
                  <td className="text-right font-mono">{formatCurrency(s.avg_cost)}</td>
                  <td className="text-right font-mono font-bold">{formatCurrency(s.total_value)}</td>
                  <td className="text-sm text-slate-500">{formatDateTime(s.last_updated)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
