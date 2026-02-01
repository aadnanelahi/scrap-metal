import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { localSalesAPI } from '../../lib/api';
import { formatCurrency, formatDate, getStatusColor, printDocument, generateSOPrintHTML } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Printer, Check, Loader2, XCircle } from 'lucide-react';

export default function LocalSaleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [so, setSo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    loadSO();
  }, [id]);

  const loadSO = async () => {
    try {
      const res = await localSalesAPI.get(id);
      setSo(res.data);
    } catch (error) {
      toast.error('Failed to load sales order');
      navigate('/local-sales');
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    setPosting(true);
    try {
      await localSalesAPI.post(id);
      toast.success('Sales order posted');
      loadSO();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to post');
    } finally {
      setPosting(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please provide a cancellation reason');
      return;
    }
    setCancelling(true);
    try {
      await localSalesAPI.cancel(id, cancelReason);
      toast.success('Sales order cancelled');
      setShowCancelDialog(false);
      loadSO();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to cancel');
    } finally {
      setCancelling(false);
    }
  };

  const handlePrint = () => {
    const html = generateSOPrintHTML(so);
    printDocument(html, `SO-${so.order_number}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!so) return null;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="local-sale-detail-page">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/local-sales')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white">
              {so.order_number}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Local Sales Order
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} className="gap-2" data-testid="print-so-btn">
            <Printer className="w-4 h-4" />
            Print
          </Button>
          {so.status !== 'posted' && so.status !== 'cancelled' && (
            <Button onClick={handlePost} disabled={posting} className="btn-accent gap-2" data-testid="post-so-btn">
              {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Post
            </Button>
          )}
          {so.status !== 'cancelled' && (
            <Button variant="outline" onClick={() => setShowCancelDialog(true)} className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50" data-testid="cancel-so-btn">
              <XCircle className="w-4 h-4" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Sales Order</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label className="form-label">Cancellation Reason</Label>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Please provide a reason for cancellation..."
              className="form-input"
              rows={3}
            />
            {so.status === 'posted' && (
              <p className="text-sm text-amber-600 mt-2">
                This document has been posted. Cancellation will create reversal entries.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>Cancel</Button>
            <Button onClick={handleCancel} disabled={cancelling} className="bg-red-600 hover:bg-red-700">
              {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Cancellation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Order Info */}
          <div className="kpi-card">
            <h3 className="fieldset-legend">Order Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs uppercase text-slate-500">Order Date</p>
                <p className="font-medium">{formatDate(so.order_date)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Delivery Date</p>
                <p className="font-medium">{so.delivery_date ? formatDate(so.delivery_date) : '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Currency</p>
                <p className="font-medium">{so.currency}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Status</p>
                <Badge className={`${getStatusColor(so.status)} border rounded-full text-xs`}>
                  {so.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="kpi-card">
            <h3 className="fieldset-legend">Customer Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase text-slate-500">Customer</p>
                <p className="font-medium">{so.customer_name}</p>
              </div>
              {so.broker_id && (
                <div>
                  <p className="text-xs uppercase text-slate-500">Broker Commission</p>
                  <p className="font-medium">{formatCurrency(so.broker_commission, so.currency)}</p>
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
                {(so.lines || []).map((line, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td className="font-medium">{line.item_name}</td>
                    <td className="text-right font-mono">{line.quantity?.toFixed(3)}</td>
                    <td className="text-right font-mono">{formatCurrency(line.unit_price, so.currency)}</td>
                    <td className="text-right">{line.vat_rate}%</td>
                    <td className="text-right font-mono">{formatCurrency(line.vat_amount, so.currency)}</td>
                    <td className="text-right font-mono font-bold">{formatCurrency(line.line_total, so.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {so.notes && (
            <div className="kpi-card">
              <h3 className="fieldset-legend">Notes</h3>
              <p className="text-slate-600 dark:text-slate-400">{so.notes}</p>
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
                <span className="font-mono">{formatCurrency(so.subtotal, so.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">VAT Amount</span>
                <span className="font-mono">{formatCurrency(so.vat_amount, so.currency)}</span>
              </div>
              {so.broker_commission > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Broker Commission</span>
                  <span className="font-mono">{formatCurrency(so.broker_commission, so.currency)}</span>
                </div>
              )}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3 flex justify-between">
                <span className="font-bold">Total Amount</span>
                <span className="font-mono font-bold text-lg">{formatCurrency(so.total_amount, so.currency)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
