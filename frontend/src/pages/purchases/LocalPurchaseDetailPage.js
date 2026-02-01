import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { localPurchasesAPI } from '../../lib/api';
import { formatCurrency, formatDate, getStatusColor, printDocument, generatePOPrintHTML } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Printer, Check, Loader2 } from 'lucide-react';

export default function LocalPurchaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    loadPO();
  }, [id]);

  const loadPO = async () => {
    try {
      const res = await localPurchasesAPI.get(id);
      setPo(res.data);
    } catch (error) {
      toast.error('Failed to load purchase order');
      navigate('/local-purchases');
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    setPosting(true);
    try {
      await localPurchasesAPI.post(id);
      toast.success('Purchase order posted');
      loadPO();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to post');
    } finally {
      setPosting(false);
    }
  };

  const handlePrint = () => {
    const html = generatePOPrintHTML(po);
    printDocument(html, `PO-${po.order_number}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!po) return null;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="local-purchase-detail-page">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/local-purchases')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white">
              {po.order_number}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Local Purchase Order
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} className="gap-2" data-testid="print-po-btn">
            <Printer className="w-4 h-4" />
            Print
          </Button>
          {po.status !== 'posted' && po.status !== 'cancelled' && (
            <Button onClick={handlePost} disabled={posting} className="btn-accent gap-2" data-testid="post-po-btn">
              {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Post
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Order Info */}
          <div className="kpi-card">
            <h3 className="fieldset-legend">Order Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs uppercase text-slate-500">Order Date</p>
                <p className="font-medium">{formatDate(po.order_date)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Expected Date</p>
                <p className="font-medium">{po.expected_date ? formatDate(po.expected_date) : '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Currency</p>
                <p className="font-medium">{po.currency}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Status</p>
                <Badge className={`${getStatusColor(po.status)} border rounded-full text-xs`}>
                  {po.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Supplier Info */}
          <div className="kpi-card">
            <h3 className="fieldset-legend">Supplier Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase text-slate-500">Supplier</p>
                <p className="font-medium">{po.supplier_name}</p>
              </div>
              {po.broker_id && (
                <div>
                  <p className="text-xs uppercase text-slate-500">Broker Commission</p>
                  <p className="font-medium">{formatCurrency(po.broker_commission, po.currency)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Line Items */}
          <div className="kpi-card p-0 overflow-hidden">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item</th>
                  <th className="text-right">Qty (MT)</th>
                  <th className="text-right">Unit Price</th>
                  <th className="text-right">VAT %</th>
                  <th className="text-right">VAT Amount</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {(po.lines || []).map((line, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td className="font-medium">{line.item_name}</td>
                    <td className="text-right font-mono">{line.quantity?.toFixed(3)}</td>
                    <td className="text-right font-mono">{formatCurrency(line.unit_price, po.currency)}</td>
                    <td className="text-right">{line.vat_rate}%</td>
                    <td className="text-right font-mono">{formatCurrency(line.vat_amount, po.currency)}</td>
                    <td className="text-right font-mono font-bold">{formatCurrency(line.line_total, po.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {po.notes && (
            <div className="kpi-card">
              <h3 className="fieldset-legend">Notes</h3>
              <p className="text-slate-600 dark:text-slate-400">{po.notes}</p>
            </div>
          )}
        </div>

        {/* Summary */}
        <div>
          <div className="kpi-card sticky top-24">
            <h3 className="fieldset-legend">Order Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-mono">{formatCurrency(po.subtotal, po.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">VAT Amount</span>
                <span className="font-mono">{formatCurrency(po.vat_amount, po.currency)}</span>
              </div>
              {po.broker_commission > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Broker Commission</span>
                  <span className="font-mono">{formatCurrency(po.broker_commission, po.currency)}</span>
                </div>
              )}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3 flex justify-between">
                <span className="font-bold">Total Amount</span>
                <span className="font-mono font-bold text-lg">{formatCurrency(po.total_amount, po.currency)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
