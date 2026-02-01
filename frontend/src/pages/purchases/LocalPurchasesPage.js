import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { localPurchasesAPI, suppliersAPI, branchesAPI, scrapItemsAPI, vatCodesAPI, brokersAPI, companiesAPI } from '../../lib/api';
import { formatCurrency, formatDate, getStatusColor, printDocument, generatePOPrintHTML } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { Plus, Eye, Printer, Loader2, Check, ShoppingCart } from 'lucide-react';

export default function LocalPurchasesPage() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await localPurchasesAPI.list();
      setPurchases(res.data);
    } catch (error) {
      toast.error('Failed to load purchases');
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async (id) => {
    try {
      await localPurchasesAPI.post(id);
      toast.success('Purchase order posted');
      loadData();
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to post';
      toast.error(message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="local-purchases-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white">
            Local Purchases
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage local purchase orders with VAT
          </p>
        </div>
        <Button
          onClick={() => navigate('/local-purchases/new')}
          className="btn-accent gap-2"
          data-testid="new-local-purchase-btn"
        >
          <Plus className="w-4 h-4" />
          New Local PO
        </Button>
      </div>

      <div className="kpi-card p-0 overflow-hidden">
        <table className="erp-table" data-testid="local-purchases-table">
          <thead>
            <tr>
              <th>PO Number</th>
              <th>Date</th>
              <th>Supplier</th>
              <th className="text-right">Subtotal</th>
              <th className="text-right">VAT</th>
              <th className="text-right">Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {purchases.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-400">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No local purchases yet</p>
                </td>
              </tr>
            ) : (
              purchases.map((po) => (
                <tr key={po.id} data-testid={`lpo-row-${po.id}`}>
                  <td className="font-mono font-medium">{po.order_number}</td>
                  <td>{formatDate(po.order_date)}</td>
                  <td className="font-medium">{po.supplier_name}</td>
                  <td className="text-right font-mono">{formatCurrency(po.subtotal)}</td>
                  <td className="text-right font-mono">{formatCurrency(po.vat_amount)}</td>
                  <td className="text-right font-mono font-bold">{formatCurrency(po.total_amount)}</td>
                  <td>
                    <Badge className={`${getStatusColor(po.status)} border rounded-full text-xs`}>
                      {po.status}
                    </Badge>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/local-purchases/${po.id}`)} data-testid={`lpo-view-btn-${po.id}`}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => {
                        const html = generatePOPrintHTML(po);
                        printDocument(html, `PO-${po.order_number}`);
                      }} data-testid={`lpo-print-btn-${po.id}`}>
                        <Printer className="w-4 h-4" />
                      </Button>
                      {po.status !== 'posted' && po.status !== 'cancelled' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePost(po.id)}
                          data-testid={`lpo-post-btn-${po.id}`}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Post
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
