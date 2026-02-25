import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { intlPurchasesAPI, suppliersAPI } from '../../lib/api';
import { formatCurrency, formatDate, getStatusColor } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { Plus, Eye, Loader2, Check, Globe, Pencil } from 'lucide-react';

export default function IntlPurchasesPage() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await intlPurchasesAPI.list();
      setPurchases(res.data);
    } catch (error) {
      toast.error('Failed to load purchases');
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async (id) => {
    try {
      await intlPurchasesAPI.post(id);
      toast.success('Purchase order posted');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to post');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="intl-purchases-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white">International Purchases</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Manage international imports with landed costs</p>
        </div>
        <Button className="btn-accent gap-2" data-testid="new-intl-purchase-btn" onClick={() => navigate('/intl-purchases/new')}>
          <Plus className="w-4 h-4" />New Intl PO
        </Button>
      </div>
      <div className="kpi-card p-0 overflow-hidden">
        <table className="erp-table" data-testid="intl-purchases-table">
          <thead><tr><th>PO Number</th><th>Date</th><th>Supplier</th><th>Currency</th><th className="text-right">Landed Cost</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {purchases.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-400"><Globe className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>No international purchases yet</p></td></tr>
            ) : (
              purchases.map((po) => (
                <tr key={po.id}>
                  <td className="font-mono font-medium">{po.order_number}</td>
                  <td>{formatDate(po.order_date)}</td>
                  <td className="font-medium">{po.supplier_name}</td>
                  <td>{po.currency}</td>
                  <td className="text-right font-mono font-bold">{formatCurrency(po.landed_cost, po.currency)}</td>
                  <td><Badge className={`${getStatusColor(po.status)} border rounded-full text-xs`}>{po.status}</Badge></td>
                  <td><div className="flex gap-2"><Button size="sm" variant="ghost"><Eye className="w-4 h-4" /></Button>{po.status !== 'posted' && po.status !== 'cancelled' && <Button size="sm" variant="ghost" onClick={() => navigate(`/intl-purchases/${po.id}/edit`)}><Pencil className="w-4 h-4" /></Button>}{po.status !== 'posted' && po.status !== 'cancelled' && <Button size="sm" variant="outline" onClick={() => handlePost(po.id)}><Check className="w-4 h-4 mr-1" />Post</Button>}</div></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
