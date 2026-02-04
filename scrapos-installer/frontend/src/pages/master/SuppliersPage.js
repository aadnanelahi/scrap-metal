import { useState, useEffect } from 'react';
import { suppliersAPI, companiesAPI } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Truck, Loader2 } from 'lucide-react';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    name: '', code: '', type: 'local', company_id: '', address: '', city: '', country: 'UAE', vat_number: '', phone: '', email: '', currency: 'AED'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [suppRes, compRes] = await Promise.all([suppliersAPI.list(), companiesAPI.list()]);
      setSuppliers(suppRes.data);
      setCompanies(compRes.data);
      if (compRes.data.length > 0) setFormData(prev => ({ ...prev, company_id: compRes.data[0].id }));
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.code || !formData.company_id) {
      toast.error('Name, code and company are required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await suppliersAPI.update(editing.id, formData);
        toast.success('Supplier updated');
      } else {
        await suppliersAPI.create(formData);
        toast.success('Supplier created');
      }
      setShowDialog(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (supplier) => { setEditing(supplier); setFormData({ ...supplier }); setShowDialog(true); };
  const handleDelete = async (id) => { if (!window.confirm('Are you sure?')) return; try { await suppliersAPI.delete(id); toast.success('Supplier deactivated'); loadData(); } catch (error) { toast.error('Failed to delete'); } };
  const resetForm = () => { setEditing(null); setFormData({ name: '', code: '', type: 'local', company_id: companies[0]?.id || '', address: '', city: '', country: 'UAE', vat_number: '', phone: '', email: '', currency: 'AED' }); };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="suppliers-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white">Suppliers</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Manage supplier accounts</p>
        </div>
        <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild><Button className="btn-accent gap-2" data-testid="new-supplier-btn"><Plus className="w-4 h-4" />New Supplier</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle className="font-manrope">{editing ? 'Edit' : 'New'} Supplier</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-4">
                <div><Label className="form-label">Name</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="form-input" data-testid="supplier-name-input" /></div>
                <div><Label className="form-label">Code</Label><Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="form-input" data-testid="supplier-code-input" /></div>
                <div><Label className="form-label">Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger className="form-input" data-testid="supplier-type-select"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="local">Local</SelectItem><SelectItem value="international">International</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="form-label">Company</Label>
                  <Select value={formData.company_id} onValueChange={(value) => setFormData({ ...formData, company_id: value })}>
                    <SelectTrigger className="form-input"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="form-label">VAT Number</Label><Input value={formData.vat_number} onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })} className="form-input" /></div>
              </div>
              <div><Label className="form-label">Address</Label><Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="form-input" /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label className="form-label">City</Label><Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="form-input" /></div>
                <div><Label className="form-label">Country</Label><Input value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className="form-input" /></div>
                <div><Label className="form-label">Currency</Label><Input value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })} className="form-input" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="form-label">Phone</Label><Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="form-input" /></div>
                <div><Label className="form-label">Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="form-input" /></div>
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full btn-accent" data-testid="supplier-save-btn">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="kpi-card p-0 overflow-hidden">
        <table className="erp-table" data-testid="suppliers-table">
          <thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Country</th><th>Phone</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {suppliers.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-400"><Truck className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>No suppliers yet</p></td></tr>
            ) : (
              suppliers.map((s) => (
                <tr key={s.id} data-testid={`supplier-row-${s.id}`}>
                  <td className="font-mono font-medium">{s.code}</td>
                  <td className="font-medium">{s.name}</td>
                  <td><Badge className={s.type === 'local' ? 'status-active' : 'status-posted'}>{s.type}</Badge></td>
                  <td>{s.country}</td>
                  <td>{s.phone || '-'}</td>
                  <td><Badge className={s.is_active ? 'status-active' : 'status-cancelled'}>{s.is_active ? 'Active' : 'Inactive'}</Badge></td>
                  <td><div className="flex gap-2"><Button size="sm" variant="ghost" onClick={() => handleEdit(s)}><Edit2 className="w-4 h-4" /></Button><Button size="sm" variant="ghost" onClick={() => handleDelete(s.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button></div></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
