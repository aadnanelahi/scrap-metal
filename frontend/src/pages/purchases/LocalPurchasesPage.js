import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { localPurchasesAPI, suppliersAPI, branchesAPI, scrapItemsAPI, vatCodesAPI, brokersAPI, companiesAPI } from '../../lib/api';
import { formatCurrency, formatDate, getStatusColor, printDocument, generatePOPrintHTML } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { Plus, Eye, Printer, Loader2, Check, ShoppingCart, Pencil, X, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';

export default function LocalPurchasesPage() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelId, setCancelId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  
  const isManager = user?.role === 'admin' || user?.role === 'manager';
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [purchasesRes, companiesRes] = await Promise.all([
        localPurchasesAPI.list(),
        companiesAPI.list()
      ]);
      setPurchases(purchasesRes.data);
      const companies = companiesRes.data || [];
      setCompany(companies.find(c => c.is_active) || companies[0] || null);
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

  const openCancelDialog = (id) => {
    setCancelId(id);
    setCancelReason('');
    setCancelDialogOpen(true);
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error('Cancellation reason is required');
      return;
    }
    setCancelling(true);
    try {
      await localPurchasesAPI.cancel(cancelId, { cancellation_reason: cancelReason });
      toast.success('Purchase order cancelled');
      setCancelDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to cancel');
    } finally {
      setCancelling(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const result = await localPurchasesAPI.delete(deleteId);
      toast.success(`Deleted! ${result.data.deleted_journal_entries} journal entries removed.`);
      setDeleteDialogOpen(false);
      setDeleteId(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete');
    } finally {
      setDeleting(false);
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
                      {/* Edit: Draft/Pending = anyone, Posted = manager only */}
                      {(po.status !== 'cancelled' && (po.status !== 'posted' || isManager)) && (
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/local-purchases/${po.id}/edit`)} data-testid={`lpo-edit-btn-${po.id}`}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => {
                        const html = generatePOPrintHTML(po, company);
                        printDocument(html, `PO-${po.order_number}`);
                      }} data-testid={`lpo-print-btn-${po.id}`}>
                        <Printer className="w-4 h-4" />
                      </Button>
                      {/* Post: Only manager can post */}
                      {po.status === 'draft' && isManager && (
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
                      {/* Cancel: Only manager can cancel */}
                      {po.status !== 'cancelled' && isManager && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => openCancelDialog(po.id)}
                          data-testid={`lpo-cancel-btn-${po.id}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                      {/* Delete: Admin only */}
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => { setDeleteId(po.id); setDeleteDialogOpen(true); }}
                          data-testid={`lpo-delete-btn-${po.id}`}
                          title="Delete permanently"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Purchase Order</DialogTitle>
            <DialogDescription>
              Please provide a reason for cancellation. This will be recorded and shown on printed documents.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="cancel-reason" className="text-sm font-medium">Cancellation Reason *</Label>
            <Textarea
              id="cancel-reason"
              placeholder="Enter reason for cancellation..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="mt-2"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Close
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Cancel PO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog - Admin Only */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Permanently Delete Purchase Order</DialogTitle>
            <DialogDescription>
              <span className="text-red-600 font-semibold">Warning:</span> This action cannot be undone. 
              This will permanently delete the purchase order and ALL related accounting entries 
              (journal entries, balance sheet impact, P&L impact, payments).
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">
              Are you absolutely sure you want to delete this purchase order?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
