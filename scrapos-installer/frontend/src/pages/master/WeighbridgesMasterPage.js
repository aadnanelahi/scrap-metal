import { useState, useEffect } from 'react';
import { weighbridgesAPI, branchesAPI } from '../../lib/api';
import { formatNumber } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit2, Scale, Loader2 } from 'lucide-react';

export default function WeighbridgesMasterPage() {
  const [weighbridges, setWeighbridges] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', code: '', branch_id: '', max_capacity: 100, unit: 'MT' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [wbRes, branchRes] = await Promise.all([weighbridgesAPI.list(), branchesAPI.list()]);
      setWeighbridges(wbRes.data);
      setBranches(branchRes.data);
      if (branchRes.data.length > 0) setFormData(prev => ({ ...prev, branch_id: branchRes.data[0].id }));
    } catch (error) { toast.error('Failed to load data'); } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.code || !formData.branch_id) { toast.error('Name, code and branch are required'); return; }
    setSaving(true);
    try {
      if (editing) { await weighbridgesAPI.update(editing.id, formData); toast.success('Weighbridge updated'); }
      else { await weighbridgesAPI.create(formData); toast.success('Weighbridge created'); }
      setShowDialog(false); resetForm(); loadData();
    } catch (error) { toast.error(error.response?.data?.detail || 'Failed to save'); } finally { setSaving(false); }
  };

  const handleEdit = (wb) => { setEditing(wb); setFormData({ ...wb }); setShowDialog(true); };
  const resetForm = () => { setEditing(null); setFormData({ name: '', code: '', branch_id: branches[0]?.id || '', max_capacity: 100, unit: 'MT' }); };
  const getBranchName = (id) => branches.find(b => b.id === id)?.name || '-';

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="weighbridges-master-page">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white">Weighbridges</h1><p className="text-slate-600 dark:text-slate-400 mt-1">Manage weighbridge equipment</p></div>
        <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild><Button className="btn-accent gap-2" data-testid="new-weighbridge-master-btn"><Plus className="w-4 h-4" />New Weighbridge</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-manrope">{editing ? 'Edit' : 'New'} Weighbridge</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="form-label">Name</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="form-input" data-testid="wb-master-name-input" /></div>
                <div><Label className="form-label">Code</Label><Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="form-input" data-testid="wb-master-code-input" /></div>
              </div>
              <div><Label className="form-label">Branch / Yard</Label><Select value={formData.branch_id} onValueChange={(value) => setFormData({ ...formData, branch_id: value })}><SelectTrigger className="form-input"><SelectValue placeholder="Select branch" /></SelectTrigger><SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="form-label">Max Capacity</Label><Input type="number" step="0.1" value={formData.max_capacity} onChange={(e) => setFormData({ ...formData, max_capacity: parseFloat(e.target.value) || 100 })} className="form-input" /></div>
                <div><Label className="form-label">Unit</Label><Input value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value.toUpperCase() })} className="form-input" /></div>
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full btn-accent" data-testid="wb-master-save-btn">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="kpi-card p-0 overflow-hidden">
        <table className="erp-table" data-testid="weighbridges-master-table">
          <thead><tr><th>Code</th><th>Name</th><th>Branch</th><th className="text-right">Max Capacity</th><th>Unit</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {weighbridges.length === 0 ? (<tr><td colSpan={7} className="text-center py-12 text-slate-400"><Scale className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>No weighbridges yet</p></td></tr>) : (
              weighbridges.map((w) => (
                <tr key={w.id} data-testid={`wb-master-row-${w.id}`}>
                  <td className="font-mono font-medium">{w.code}</td>
                  <td className="font-medium">{w.name}</td>
                  <td>{getBranchName(w.branch_id)}</td>
                  <td className="text-right font-mono">{formatNumber(w.max_capacity)}</td>
                  <td>{w.unit}</td>
                  <td><Badge className={w.is_active ? 'status-active' : 'status-cancelled'}>{w.is_active ? 'Active' : 'Inactive'}</Badge></td>
                  <td><Button size="sm" variant="ghost" onClick={() => handleEdit(w)}><Edit2 className="w-4 h-4" /></Button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
