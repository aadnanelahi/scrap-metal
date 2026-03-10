import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { localSalesAPI, companiesAPI } from '../../lib/api';
import { formatCurrency, formatDate, getStatusColor, printDocument, generateSOPrintHTML } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { Plus, Eye, Printer, Loader2, Check, Truck } from 'lucide-react';

export default function LocalSalesPage() {
  const [sales, setSales] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [salesRes, companiesRes] = await Promise.all([
        localSalesAPI.list(),
        companiesAPI.list()
      ]);
      setSales(salesRes.data);
      const companies = companiesRes.data || [];
      setCompany(companies.find(c => c.is_active) || companies[0] || null);
    } catch (error) {
      toast.error('Failed to load sales');
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async (id) => {
    try {
      await localSalesAPI.post(id);
      toast.success('Sales order posted');
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
    <div className="space-y-6 animate-fade-in" data-testid="local-sales-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white">
            Local Sales
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage local sales orders with VAT
          </p>
        </div>
        <Button
          onClick={() => navigate('/local-sales/new')}
          className="btn-accent gap-2"
          data-testid="new-local-sale-btn"
        >
          <Plus className="w-4 h-4" />
          New Local SO
        </Button>
      </div>

      <div className="kpi-card p-0 overflow-hidden">
        <table className="erp-table" data-testid="local-sales-table">
          <thead>
            <tr>
              <th>SO Number</th>
              <th>Date</th>
              <th>Customer</th>
              <th className="text-right">Subtotal</th>
              <th className="text-right">VAT</th>
              <th className="text-right">Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-400">
                  <Truck className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No local sales yet</p>
                </td>
              </tr>
            ) : (
              sales.map((so) => (
                <tr key={so.id} data-testid={`lso-row-${so.id}`}>
                  <td className="font-mono font-medium">{so.order_number}</td>
                  <td>{formatDate(so.order_date)}</td>
                  <td className="font-medium">{so.customer_name}</td>
                  <td className="text-right font-mono">{formatCurrency(so.subtotal)}</td>
                  <td className="text-right font-mono">{formatCurrency(so.vat_amount)}</td>
                  <td className="text-right font-mono font-bold">{formatCurrency(so.total_amount)}</td>
                  <td>
                    <Badge className={`${getStatusColor(so.status)} border rounded-full text-xs`}>
                      {so.status}
                    </Badge>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/local-sales/${so.id}`)} data-testid={`lso-view-btn-${so.id}`}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => {
                        const html = generateSOPrintHTML(so, company);
                        printDocument(html, `SO-${so.order_number}`);
                      }} data-testid={`lso-print-btn-${so.id}`}>
                        <Printer className="w-4 h-4" />
                      </Button>
                      {so.status !== 'posted' && so.status !== 'cancelled' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePost(so.id)}
                          data-testid={`lso-post-btn-${so.id}`}
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
