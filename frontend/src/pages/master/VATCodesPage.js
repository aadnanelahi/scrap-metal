import { useState, useEffect } from 'react';
import { vatCodesAPI } from '../../lib/api';
import { formatNumber } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit2, Receipt, Loader2 } from 'lucide-react';

export default function VATCodesPage() {
  const [vatCodes, setVatCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', code: '', rate: 5, description: '', is_default: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try { const res = await vatCodesAPI.list(); setVatCodes(res.data); } catch (error) { toast.error('Failed to load VAT codes'); } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.code) { toast.error('Name and code are required'); return; }
    setSaving(true);
    try {
      if (editing) { await vatCodesAPI.update(editing.id, formData); toast.success('VAT code updated'); }
      else { await vatCodesAPI.create(formData); toast.success('VAT code created'); }
      setShowDialog(false); resetForm(); loadData();
    } catch (error) { toast.error(error.response?.data?.detail || 'Failed to save'); } finally { setSaving(false); }
  };

  const handleEdit = (vat) => { setEditing(vat); setFormData({ ...vat }); setShowDialog(true); };
  const resetForm = () => { setEditing(null); setFormData({ name: '', code: '', rate: 5, description: '', is_default: false }); };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="vat-codes-page">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white">VAT Codes</h1><p className="text-slate-600 dark:text-slate-400 mt-1">Manage UAE VAT rates</p></div>
        <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild><Button className="btn-accent gap-2" data-testid="new-vat-btn"><Plus className="w-4 h-4" />New VAT Code</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-manrope">{editing ? 'Edit' : 'New'} VAT Code</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="form-label">Name</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="form-input" data-testid="vat-name-input" /></div>
                <div><Label className="form-label">Code</Label><Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="form-input" data-testid="vat-code-input" /></div>
              </div>
              <div><Label className="form-label">Rate (%)</Label><Input type="number" step="0.01" value={formData.rate} onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })} className="form-input" data-testid="vat-rate-input" /></div>
              <div><Label className="form-label">Description</Label><Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="form-input" /></div>
              <Button onClick={handleSave} disabled={saving} className="w-full btn-accent" data-testid="vat-save-btn">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="kpi-card p-0 overflow-hidden">
        <table className="erp-table" data-testid="vat-codes-table">
          <thead><tr><th>Code</th><th>Name</th><th className="text-right">Rate</th><th>Description</th><th>Default</th><th>Actions</th></tr></thead>
          <tbody>
            {vatCodes.length === 0 ? (<tr><td colSpan={6} className="text-center py-12 text-slate-400"><Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>No VAT codes. Load sample data from Dashboard.</p></td></tr>) : (
              vatCodes.map((v) => (
                <tr key={v.id} data-testid={`vat-row-${v.id}`}>
                  <td className="font-mono font-medium">{v.code}</td>
                  <td className="font-medium">{v.name}</td>
                  <td className="text-right font-mono">{formatNumber(v.rate, 2)}%</td>
                  <td className="text-slate-500">{v.description || '-'}</td>
                  <td>{v.is_default && <Badge className="status-active">Default</Badge>}</td>
                  <td><Button size="sm" variant="ghost" onClick={() => handleEdit(v)}><Edit2 className="w-4 h-4" /></Button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
