import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { exportSalesAPI, customersAPI } from '../../lib/api';
import { formatCurrency, formatDate, getStatusColor } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { Plus, Eye, Loader2, Check, Globe } from 'lucide-react';

export default function ExportSalesPage() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await exportSalesAPI.list();
      setSales(res.data);
    } catch (error) {
      toast.error('Failed to load sales');
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async (id) => {
    try {
      await exportSalesAPI.post(id);
      toast.success('Export contract posted');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to post');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="export-sales-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white">Export Sales</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Manage export contracts (zero-rated VAT)</p>
        </div>
        <Button className="btn-accent gap-2" data-testid="new-export-sale-btn" onClick={() => navigate('/export-sales/new')}>
          <Plus className="w-4 h-4" />New Export Contract
        </Button>
      </div>
      <div className="kpi-card p-0 overflow-hidden">
        <table className="erp-table" data-testid="export-sales-table">
          <thead><tr><th>Contract #</th><th>Date</th><th>Customer</th><th>Currency</th><th className="text-right">Total</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {sales.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-400"><Globe className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>No export sales yet</p></td></tr>
            ) : (
              sales.map((s) => (
                <tr key={s.id}>
                  <td className="font-mono font-medium">{s.contract_number}</td>
                  <td>{formatDate(s.contract_date)}</td>
                  <td className="font-medium">{s.customer_name}</td>
                  <td>{s.currency}</td>
                  <td className="text-right font-mono font-bold">{formatCurrency(s.total_amount, s.currency)}</td>
                  <td><Badge className={`${getStatusColor(s.status)} border rounded-full text-xs`}>{s.status}</Badge></td>
                  <td><div className="flex gap-2"><Button size="sm" variant="ghost"><Eye className="w-4 h-4" /></Button>{s.status !== 'posted' && <Button size="sm" variant="outline" onClick={() => handlePost(s.id)}><Check className="w-4 h-4 mr-1" />Post</Button>}</div></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
