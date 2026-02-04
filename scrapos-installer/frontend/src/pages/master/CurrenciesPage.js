import { useState, useEffect } from 'react';
import { currenciesAPI } from '../../lib/api';
import { formatNumber } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit2, DollarSign, Loader2 } from 'lucide-react';

export default function CurrenciesPage() {
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', code: '', symbol: '', exchange_rate: 1.0, is_base: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try { const res = await currenciesAPI.list(); setCurrencies(res.data); } catch (error) { toast.error('Failed to load currencies'); } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.code || !formData.symbol) { toast.error('Name, code and symbol are required'); return; }
    setSaving(true);
    try {
      if (editing) { await currenciesAPI.update(editing.id, formData); toast.success('Currency updated'); }
      else { await currenciesAPI.create(formData); toast.success('Currency created'); }
      setShowDialog(false); resetForm(); loadData();
    } catch (error) { toast.error(error.response?.data?.detail || 'Failed to save'); } finally { setSaving(false); }
  };

  const handleEdit = (curr) => { setEditing(curr); setFormData({ ...curr }); setShowDialog(true); };
  const resetForm = () => { setEditing(null); setFormData({ name: '', code: '', symbol: '', exchange_rate: 1.0, is_base: false }); };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="currencies-page">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white">Currencies</h1><p className="text-slate-600 dark:text-slate-400 mt-1">Manage currencies and exchange rates</p></div>
        <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild><Button className="btn-accent gap-2" data-testid="new-currency-btn"><Plus className="w-4 h-4" />New Currency</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-manrope">{editing ? 'Edit' : 'New'} Currency</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="form-label">Name</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="form-input" data-testid="currency-name-input" /></div>
                <div><Label className="form-label">Code</Label><Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="form-input" data-testid="currency-code-input" maxLength={3} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="form-label">Symbol</Label><Input value={formData.symbol} onChange={(e) => setFormData({ ...formData, symbol: e.target.value })} className="form-input" /></div>
                <div><Label className="form-label">Exchange Rate (to AED)</Label><Input type="number" step="0.0001" value={formData.exchange_rate} onChange={(e) => setFormData({ ...formData, exchange_rate: parseFloat(e.target.value) || 1 })} className="form-input" /></div>
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full btn-accent" data-testid="currency-save-btn">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="kpi-card p-0 overflow-hidden">
        <table className="erp-table" data-testid="currencies-table">
          <thead><tr><th>Code</th><th>Name</th><th>Symbol</th><th className="text-right">Exchange Rate</th><th>Type</th><th>Actions</th></tr></thead>
          <tbody>
            {currencies.length === 0 ? (<tr><td colSpan={6} className="text-center py-12 text-slate-400"><DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>No currencies. Load sample data from Dashboard.</p></td></tr>) : (
              currencies.map((c) => (
                <tr key={c.id} data-testid={`currency-row-${c.id}`}>
                  <td className="font-mono font-medium">{c.code}</td>
                  <td className="font-medium">{c.name}</td>
                  <td className="text-lg">{c.symbol}</td>
                  <td className="text-right font-mono">{formatNumber(c.exchange_rate, 4)}</td>
                  <td>{c.is_base && <Badge className="status-active">Base</Badge>}</td>
                  <td><Button size="sm" variant="ghost" onClick={() => handleEdit(c)}><Edit2 className="w-4 h-4" /></Button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
