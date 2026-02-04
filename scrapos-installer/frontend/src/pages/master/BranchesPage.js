import { useState, useEffect } from 'react';
import { branchesAPI, companiesAPI } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Building, Loader2 } from 'lucide-react';

export default function BranchesPage() {
  const [branches, setBranches] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', code: '', company_id: '', address: '', city: '', country: 'UAE', is_yard: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [branchRes, compRes] = await Promise.all([branchesAPI.list(), companiesAPI.list()]);
      setBranches(branchRes.data);
      setCompanies(compRes.data);
      if (compRes.data.length > 0) setFormData(prev => ({ ...prev, company_id: compRes.data[0].id }));
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.code || !formData.company_id) { toast.error('Name, code and company are required'); return; }
    setSaving(true);
    try {
      if (editing) { await branchesAPI.update(editing.id, formData); toast.success('Branch updated'); }
      else { await branchesAPI.create(formData); toast.success('Branch created'); }
      setShowDialog(false); resetForm(); loadData();
    } catch (error) { toast.error(error.response?.data?.detail || 'Failed to save'); } finally { setSaving(false); }
  };

  const handleEdit = (branch) => { setEditing(branch); setFormData({ ...branch }); setShowDialog(true); };
  const handleDelete = async (id) => { if (!window.confirm('Are you sure?')) return; try { await branchesAPI.delete(id); toast.success('Branch deactivated'); loadData(); } catch (error) { toast.error('Failed to delete'); } };
  const resetForm = () => { setEditing(null); setFormData({ name: '', code: '', company_id: companies[0]?.id || '', address: '', city: '', country: 'UAE', is_yard: true }); };
  const getCompanyName = (id) => companies.find(c => c.id === id)?.name || '-';

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="branches-page">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white">Branches / Yards</h1><p className="text-slate-600 dark:text-slate-400 mt-1">Manage branch locations and yards</p></div>
        <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild><Button className="btn-accent gap-2" data-testid="new-branch-btn"><Plus className="w-4 h-4" />New Branch</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-manrope">{editing ? 'Edit' : 'New'} Branch</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="form-label">Name</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="form-input" data-testid="branch-name-input" /></div>
                <div><Label className="form-label">Code</Label><Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="form-input" data-testid="branch-code-input" /></div>
              </div>
              <div><Label className="form-label">Company</Label><Select value={formData.company_id} onValueChange={(value) => setFormData({ ...formData, company_id: value })}><SelectTrigger className="form-input"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="form-label">Address</Label><Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="form-input" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="form-label">City</Label><Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="form-input" /></div>
                <div><Label className="form-label">Country</Label><Input value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className="form-input" /></div>
              </div>
              <div className="flex items-center gap-2"><Checkbox checked={formData.is_yard} onCheckedChange={(checked) => setFormData({ ...formData, is_yard: checked })} /><Label>Is Scrap Yard (holds inventory)</Label></div>
              <Button onClick={handleSave} disabled={saving} className="w-full btn-accent" data-testid="branch-save-btn">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="kpi-card p-0 overflow-hidden">
        <table className="erp-table" data-testid="branches-table">
          <thead><tr><th>Code</th><th>Name</th><th>Company</th><th>City</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {branches.length === 0 ? (<tr><td colSpan={7} className="text-center py-12 text-slate-400"><Building className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>No branches yet</p></td></tr>) : (
              branches.map((b) => (
                <tr key={b.id} data-testid={`branch-row-${b.id}`}>
                  <td className="font-mono font-medium">{b.code}</td>
                  <td className="font-medium">{b.name}</td>
                  <td>{getCompanyName(b.company_id)}</td>
                  <td>{b.city || '-'}</td>
                  <td><Badge className={b.is_yard ? 'status-active' : 'status-draft'}>{b.is_yard ? 'Yard' : 'Office'}</Badge></td>
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
