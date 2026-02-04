import { useState, useEffect } from 'react';
import { brokersAPI, companiesAPI } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Users, Loader2 } from 'lucide-react';

export default function BrokersPage() {
  const [brokers, setBrokers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', code: '', company_id: '', commission_type: 'per_mt', commission_rate: 0, phone: '', email: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [brokerRes, compRes] = await Promise.all([brokersAPI.list(), companiesAPI.list()]);
      setBrokers(brokerRes.data);
      setCompanies(compRes.data);
      if (compRes.data.length > 0) setFormData(prev => ({ ...prev, company_id: compRes.data[0].id }));
    } catch (error) { toast.error('Failed to load data'); } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.code || !formData.company_id) { toast.error('Name, code and company are required'); return; }
    setSaving(true);
    try {
      if (editing) { await brokersAPI.update(editing.id, formData); toast.success('Broker updated'); }
      else { await brokersAPI.create(formData); toast.success('Broker created'); }
      setShowDialog(false); resetForm(); loadData();
    } catch (error) { toast.error(error.response?.data?.detail || 'Failed to save'); } finally { setSaving(false); }
  };

  const handleEdit = (broker) => { setEditing(broker); setFormData({ ...broker }); setShowDialog(true); };
  const handleDelete = async (id) => { if (!window.confirm('Are you sure?')) return; try { await brokersAPI.delete(id); toast.success('Broker deactivated'); loadData(); } catch (error) { toast.error('Failed to delete'); } };
  const resetForm = () => { setEditing(null); setFormData({ name: '', code: '', company_id: companies[0]?.id || '', commission_type: 'per_mt', commission_rate: 0, phone: '', email: '' }); };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="brokers-page">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white">Brokers</h1><p className="text-slate-600 dark:text-slate-400 mt-1">Manage broker agents and commissions</p></div>
        <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild><Button className="btn-accent gap-2" data-testid="new-broker-btn"><Plus className="w-4 h-4" />New Broker</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-manrope">{editing ? 'Edit' : 'New'} Broker</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="form-label">Name</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="form-input" data-testid="broker-name-input" /></div>
                <div><Label className="form-label">Code</Label><Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="form-input" data-testid="broker-code-input" /></div>
              </div>
              <div><Label className="form-label">Company</Label><Select value={formData.company_id} onValueChange={(value) => setFormData({ ...formData, company_id: value })}><SelectTrigger className="form-input"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="form-label">Commission Type</Label><Select value={formData.commission_type} onValueChange={(value) => setFormData({ ...formData, commission_type: value })}><SelectTrigger className="form-input"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="per_mt">Per MT</SelectItem><SelectItem value="percentage">Percentage</SelectItem></SelectContent></Select></div>
                <div><Label className="form-label">Default Rate</Label><Input type="number" step="0.01" value={formData.commission_rate} onChange={(e) => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) || 0 })} className="form-input" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="form-label">Phone</Label><Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="form-input" /></div>
                <div><Label className="form-label">Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="form-input" /></div>
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full btn-accent" data-testid="broker-save-btn">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="kpi-card p-0 overflow-hidden">
        <table className="erp-table" data-testid="brokers-table">
          <thead><tr><th>Code</th><th>Name</th><th>Commission Type</th><th>Rate</th><th>Phone</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {brokers.length === 0 ? (<tr><td colSpan={7} className="text-center py-12 text-slate-400"><Users className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>No brokers yet</p></td></tr>) : (
              brokers.map((b) => (
                <tr key={b.id} data-testid={`broker-row-${b.id}`}>
                  <td className="font-mono font-medium">{b.code}</td>
                  <td className="font-medium">{b.name}</td>
                  <td className="capitalize">{b.commission_type?.replace('_', ' ')}</td>
                  <td className="font-mono">{b.commission_rate} {b.commission_type === 'percentage' ? '%' : '/MT'}</td>
                  <td>{b.phone || '-'}</td>
                  <td><Badge className={b.is_active ? 'status-active' : 'status-cancelled'}>{b.is_active ? 'Active' : 'Inactive'}</Badge></td>
                  <td><div className="flex gap-2"><Button size="sm" variant="ghost" onClick={() => handleEdit(b)}><Edit2 className="w-4 h-4" /></Button><Button size="sm" variant="ghost" onClick={() => handleDelete(b.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button></div></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
