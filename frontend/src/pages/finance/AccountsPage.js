import { useState, useEffect } from 'react';
import { accountsAPI } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Calculator, Loader2 } from 'lucide-react';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({ code: '', name: '', account_type: 'asset' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try { const res = await accountsAPI.list(); setAccounts(res.data); } catch (error) { toast.error('Failed to load accounts'); } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!formData.code || !formData.name) { toast.error('Code and name are required'); return; }
    setSaving(true);
    try {
      await accountsAPI.create(formData);
      toast.success('Account created');
      setShowDialog(false);
      setFormData({ code: '', name: '', account_type: 'asset' });
      loadData();
    } catch (error) { toast.error(error.response?.data?.detail || 'Failed to save'); } finally { setSaving(false); }
  };

  const getTypeBadge = (type) => {
    const colors = { asset: 'status-active', liability: 'status-cancelled', equity: 'status-posted', income: 'status-pending', expense: 'status-draft' };
    return colors[type] || 'status-draft';
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="accounts-page">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white">Chart of Accounts</h1><p className="text-slate-600 dark:text-slate-400 mt-1">General ledger accounts</p></div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild><Button className="btn-accent gap-2" data-testid="new-account-btn"><Plus className="w-4 h-4" />New Account</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-manrope">New Account</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="form-label">Code</Label><Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} className="form-input" data-testid="account-code-input" /></div>
                <div><Label className="form-label">Type</Label>
                  <Select value={formData.account_type} onValueChange={(value) => setFormData({ ...formData, account_type: value })}>
                    <SelectTrigger className="form-input"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asset">Asset</SelectItem>
                      <SelectItem value="liability">Liability</SelectItem>
                      <SelectItem value="equity">Equity</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label className="form-label">Name</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="form-input" data-testid="account-name-input" /></div>
              <Button onClick={handleSave} disabled={saving} className="w-full btn-accent" data-testid="account-save-btn">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="kpi-card p-0 overflow-hidden">
        <table className="erp-table" data-testid="accounts-table">
          <thead><tr><th>Code</th><th>Name</th><th>Type</th><th className="text-right">Balance</th><th>Status</th></tr></thead>
          <tbody>
            {accounts.length === 0 ? (<tr><td colSpan={5} className="text-center py-12 text-slate-400"><Calculator className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>No accounts. Load sample data from Dashboard.</p></td></tr>) : (
              accounts.map((a) => (
                <tr key={a.id} data-testid={`account-row-${a.id}`}>
                  <td className="font-mono font-medium">{a.code}</td>
                  <td className="font-medium">{a.name}</td>
                  <td><Badge className={`${getTypeBadge(a.account_type)} capitalize`}>{a.account_type}</Badge></td>
                  <td className="text-right font-mono">{formatCurrency(a.balance)}</td>
                  <td><Badge className={a.is_active ? 'status-active' : 'status-cancelled'}>{a.is_active ? 'Active' : 'Inactive'}</Badge></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
