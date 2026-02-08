import { useState, useEffect, useRef } from 'react';
import { companiesAPI } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Building2, Loader2, Upload, X } from 'lucide-react';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    name: '', code: '', address: '', country: 'UAE', currency: 'AED', vat_number: '', phone: '', email: '', slogan: '', logo: ''
  });
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await companiesAPI.list();
      setCompanies(res.data);
    } catch (error) {
      toast.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.code) {
      toast.error('Name and code are required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await companiesAPI.update(editing.id, formData);
        toast.success('Company updated');
      } else {
        await companiesAPI.create(formData);
        toast.success('Company created');
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

  const handleEdit = (company) => {
    setEditing(company);
    setFormData({ ...company, slogan: company.slogan || '', logo: company.logo || '' });
    setLogoPreview(company.logo || null);
    setShowDialog(true);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB');
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result;
      setLogoPreview(base64);
      setFormData({ ...formData, logo: base64 });
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoPreview(null);
    setFormData({ ...formData, logo: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      await companiesAPI.delete(id);
      toast.success('Company deactivated');
      loadData();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const resetForm = () => {
    setEditing(null);
    setFormData({ name: '', code: '', address: '', country: 'UAE', currency: 'AED', vat_number: '', phone: '', email: '', slogan: '', logo: '' });
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="companies-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white">Companies</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Manage company entities</p>
        </div>
        <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="btn-accent gap-2" data-testid="new-company-btn"><Plus className="w-4 h-4" />New Company</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-manrope">{editing ? 'Edit' : 'New'} Company</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              {/* Logo Upload */}
              <div className="space-y-2">
                <Label className="form-label">Company Logo</Label>
                <div className="flex items-center gap-4">
                  {logoPreview ? (
                    <div className="relative">
                      <img src={logoPreview} alt="Logo preview" className="w-24 h-24 object-contain border rounded-lg bg-white p-1" />
                      <button onClick={removeLogo} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-slate-50 dark:bg-slate-800">
                      <Building2 className="w-8 h-8 text-slate-400" />
                    </div>
                  )}
                  <div>
                    <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
                      <Upload className="w-4 h-4" />
                      {logoPreview ? 'Change Logo' : 'Upload Logo'}
                    </Button>
                    <p className="text-xs text-slate-500 mt-1">PNG, JPG up to 2MB</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="form-label">Name</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="form-input" data-testid="company-name-input" /></div>
                <div><Label className="form-label">Code</Label><Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="form-input" data-testid="company-code-input" /></div>
              </div>
              
              {/* Slogan */}
              <div><Label className="form-label">Slogan / Tagline</Label><Input value={formData.slogan} onChange={(e) => setFormData({ ...formData, slogan: e.target.value })} className="form-input" placeholder="e.g., Excellence in Scrap Metal Trading" /></div>
              
              <div><Label className="form-label">Address</Label><Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="form-input" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="form-label">Country</Label><Input value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className="form-input" /></div>
                <div><Label className="form-label">Currency</Label><Input value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })} className="form-input" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="form-label">VAT Number</Label><Input value={formData.vat_number} onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })} className="form-input" /></div>
                <div><Label className="form-label">Phone</Label><Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="form-input" /></div>
              </div>
              <div><Label className="form-label">Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="form-input" /></div>
              <Button onClick={handleSave} disabled={saving} className="w-full btn-accent" data-testid="company-save-btn">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="kpi-card p-0 overflow-hidden">
        <table className="erp-table" data-testid="companies-table">
          <thead><tr><th>Logo</th><th>Code</th><th>Name</th><th>Country</th><th>Currency</th><th>VAT Number</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {companies.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400"><Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>No companies yet</p></td></tr>
            ) : (
              companies.map((c) => (
                <tr key={c.id} data-testid={`company-row-${c.id}`}>
                  <td>
                    {c.logo ? (
                      <img src={c.logo} alt={c.name} className="w-10 h-10 object-contain rounded border bg-white" />
                    ) : (
                      <div className="w-10 h-10 rounded border bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                  </td>
                  <td className="font-mono font-medium">{c.code}</td>
                  <td>
                    <div>
                      <p className="font-medium">{c.name}</p>
                      {c.slogan && <p className="text-xs text-slate-500 dark:text-slate-400">{c.slogan}</p>}
                    </div>
                  </td>
                  <td>{c.country}</td>
                  <td>{c.currency}</td>
                  <td>{c.vat_number || '-'}</td>
                  <td><Badge className={c.is_active ? 'status-active' : 'status-cancelled'}>{c.is_active ? 'Active' : 'Inactive'}</Badge></td>
                  <td><div className="flex gap-2"><Button size="sm" variant="ghost" onClick={() => handleEdit(c)}><Edit2 className="w-4 h-4" /></Button><Button size="sm" variant="ghost" onClick={() => handleDelete(c.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button></div></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
