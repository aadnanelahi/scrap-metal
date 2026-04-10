import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { exportSalesAPI, customersAPI, companiesAPI } from '../../lib/api';
import { formatCurrency, formatDate, getStatusColor, printDocument, generateExportSalesPrintHTML } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Eye, Loader2, Check, Globe, Printer, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ExportSalesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  const isAdmin = user?.role === 'admin';

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [salesRes, companiesRes] = await Promise.all([
        exportSalesAPI.list(),
        companiesAPI.list()
      ]);
      setSales(salesRes.data);
      // Get the first active company
      const companies = companiesRes.data || [];
      setCompany(companies.find(c => c.is_active) || companies[0] || null);
    } catch (error) {
      toast.error('Failed to load sales');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const result = await exportSalesAPI.delete(deleteId);
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
                  <td className="font-mono font-medium">{s.contract_number || s.order_number}</td>
                  <td>{formatDate(s.contract_date || s.order_date)}</td>
                  <td className="font-medium">{s.customer_name}</td>
                  <td>{s.currency}</td>
                  <td className="text-right font-mono font-bold">{formatCurrency(s.total_amount, s.currency)}</td>
                  <td><Badge className={`${getStatusColor(s.status)} border rounded-full text-xs`}>{s.status}</Badge></td>
                  <td>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" data-testid={`esc-view-${s.id}`}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {s.status !== 'posted' && s.status !== 'cancelled' && (
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/export-sales/${s.id}/edit`)} data-testid={`esc-edit-${s.id}`}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => {
                        const html = generateExportSalesPrintHTML(s, company);
                        printDocument(html, `ESC-${s.contract_number || s.order_number}`);
                      }} data-testid={`esc-print-${s.id}`}>
                        <Printer className="w-4 h-4" />
                      </Button>
                      {s.status !== 'posted' && s.status !== 'cancelled' && (
                        <Button size="sm" variant="outline" onClick={() => handlePost(s.id)} data-testid={`esc-post-${s.id}`}>
                          <Check className="w-4 h-4 mr-1" />Post
                        </Button>
                      )}
                      {/* Delete: Admin only */}
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => { setDeleteId(s.id); setDeleteDialogOpen(true); }}
                          data-testid={`esc-delete-${s.id}`}
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
            <DialogTitle className="text-red-600">Permanently Delete Export Contract</DialogTitle>
            <DialogDescription>
              <span className="text-red-600 font-semibold">Warning:</span> This action cannot be undone. 
              This will permanently delete the export contract and ALL related accounting entries 
              (journal entries, receivables, P&L impact, payments).
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">
              Are you absolutely sure you want to delete this export contract?
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
