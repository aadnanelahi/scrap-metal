import { useState, useEffect } from 'react';
import { portsAPI } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit2, Anchor, Loader2 } from 'lucide-react';

export default function PortsPage() {
  const [ports, setPorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', code: '', country: 'UAE', city: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try { const res = await portsAPI.list(); setPorts(res.data); } catch (error) { toast.error('Failed to load ports'); } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.code || !formData.country) { toast.error('Name, code and country are required'); return; }
    setSaving(true);
    try {
      if (editing) { await portsAPI.update(editing.id, formData); toast.success('Port updated'); }
      else { await portsAPI.create(formData); toast.success('Port created'); }
      setShowDialog(false); resetForm(); loadData();
    } catch (error) { toast.error(error.response?.data?.detail || 'Failed to save'); } finally { setSaving(false); }
  };

  const handleEdit = (port) => { setEditing(port); setFormData({ ...port }); setShowDialog(true); };
  const resetForm = () => { setEditing(null); setFormData({ name: '', code: '', country: 'UAE', city: '' }); };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="ports-page">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white">Ports</h1><p className="text-slate-600 dark:text-slate-400 mt-1">Manage shipping ports for international trade</p></div>
        <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild><Button className="btn-accent gap-2" data-testid="new-port-btn"><Plus className="w-4 h-4" />New Port</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-manrope">{editing ? 'Edit' : 'New'} Port</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="form-label">Name</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="form-input" data-testid="port-name-input" /></div>
                <div><Label className="form-label">Code (UN/LOCODE)</Label><Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="form-input" data-testid="port-code-input" maxLength={5} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="form-label">Country</Label><Input value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className="form-input" /></div>
                <div><Label className="form-label">City</Label><Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="form-input" /></div>
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full btn-accent" data-testid="port-save-btn">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="kpi-card p-0 overflow-hidden">
        <table className="erp-table" data-testid="ports-table">
          <thead><tr><th>Code</th><th>Name</th><th>Country</th><th>City</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {ports.length === 0 ? (<tr><td colSpan={6} className="text-center py-12 text-slate-400"><Anchor className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>No ports. Load sample data from Dashboard.</p></td></tr>) : (
              ports.map((p) => (
                <tr key={p.id} data-testid={`port-row-${p.id}`}>
                  <td className="font-mono font-medium">{p.code}</td>
                  <td className="font-medium">{p.name}</td>
                  <td>{p.country}</td>
                  <td>{p.city || '-'}</td>
                  <td><Badge className={p.is_active ? 'status-active' : 'status-cancelled'}>{p.is_active ? 'Active' : 'Inactive'}</Badge></td>
                  <td><Button size="sm" variant="ghost" onClick={() => handleEdit(p)}><Edit2 className="w-4 h-4" /></Button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
