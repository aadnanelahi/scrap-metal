import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { intlPurchasesAPI, companiesAPI } from '../../lib/api';
import { formatCurrency, formatDate, getStatusColor, printDocument, generatePOPrintHTML } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Eye, Loader2, Check, Globe, Pencil, Printer, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function IntlPurchasesPage() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  
  const isAdmin = user?.role === 'admin';

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [purchasesRes, companiesRes] = await Promise.all([
        intlPurchasesAPI.list(),
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
      await intlPurchasesAPI.post(id);
      toast.success('Purchase order posted');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to post');
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const result = await intlPurchasesAPI.delete(deleteId);
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
                  <td>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost"><Eye className="w-4 h-4" /></Button>
                      {po.status !== 'posted' && po.status !== 'cancelled' && (
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/intl-purchases/${po.id}/edit`)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => { const html = generatePOPrintHTML(po, company); printDocument(html, `IPO-${po.order_number}`); }}>
                        <Printer className="w-4 h-4" />
                      </Button>
                      {po.status !== 'posted' && po.status !== 'cancelled' && (
                        <Button size="sm" variant="outline" onClick={() => handlePost(po.id)}>
                          <Check className="w-4 h-4 mr-1" />Post
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => { setDeleteId(po.id); setDeleteDialogOpen(true); }}
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

      {/* Delete Dialog - Admin Only */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Permanently Delete International PO</DialogTitle>
            <DialogDescription>
              <span className="text-red-600 font-semibold">Warning:</span> This action cannot be undone. 
              This will permanently delete the purchase order and ALL related accounting entries.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">
              Are you absolutely sure you want to delete this international purchase order?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
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
