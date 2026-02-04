import { useState, useEffect } from 'react';
import { scrapItemsAPI, scrapCategoriesAPI } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Boxes, Loader2 } from 'lucide-react';

export default function ScrapItemsPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    name: '', code: '', category_id: '', grade: '', type: '', density: '', unit: 'MT', min_stock: 0
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [itemRes, catRes] = await Promise.all([scrapItemsAPI.list(), scrapCategoriesAPI.list()]);
      setItems(itemRes.data);
      setCategories(catRes.data);
      if (catRes.data.length > 0) setFormData(prev => ({ ...prev, category_id: catRes.data[0].id }));
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.code || !formData.category_id) {
      toast.error('Name, code and category are required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await scrapItemsAPI.update(editing.id, formData);
        toast.success('Item updated');
      } else {
        await scrapItemsAPI.create(formData);
        toast.success('Item created');
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

  const handleEdit = (item) => { setEditing(item); setFormData({ ...item }); setShowDialog(true); };
  const handleDelete = async (id) => { if (!window.confirm('Are you sure?')) return; try { await scrapItemsAPI.delete(id); toast.success('Item deactivated'); loadData(); } catch (error) { toast.error('Failed to delete'); } };
  const resetForm = () => { setEditing(null); setFormData({ name: '', code: '', category_id: categories[0]?.id || '', grade: '', type: '', density: '', unit: 'MT', min_stock: 0 }); };

  const getCategoryName = (id) => categories.find(c => c.id === id)?.name || '-';

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="scrap-items-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white">Scrap Items</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Manage scrap metal items and grades</p>
        </div>
        <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild><Button className="btn-accent gap-2" data-testid="new-item-btn"><Plus className="w-4 h-4" />New Item</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="font-manrope">{editing ? 'Edit' : 'New'} Scrap Item</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="form-label">Name</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="form-input" data-testid="item-name-input" /></div>
                <div><Label className="form-label">Code</Label><Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="form-input" data-testid="item-code-input" /></div>
              </div>
              <div><Label className="form-label">Category</Label>
                <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                  <SelectTrigger className="form-input" data-testid="item-category-select"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="form-label">Grade</Label><Input value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })} className="form-input" placeholder="e.g., 1&2, A, 304" /></div>
                <div><Label className="form-label">Type</Label><Input value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="form-input" placeholder="e.g., HMS, Shredded" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label className="form-label">Unit</Label><Input value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value.toUpperCase() })} className="form-input" /></div>
                <div><Label className="form-label">Density</Label><Input type="number" step="0.01" value={formData.density} onChange={(e) => setFormData({ ...formData, density: e.target.value })} className="form-input" /></div>
                <div><Label className="form-label">Min Stock</Label><Input type="number" step="0.001" value={formData.min_stock} onChange={(e) => setFormData({ ...formData, min_stock: parseFloat(e.target.value) || 0 })} className="form-input" /></div>
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full btn-accent" data-testid="item-save-btn">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="kpi-card p-0 overflow-hidden">
        <table className="erp-table" data-testid="scrap-items-table">
          <thead><tr><th>Code</th><th>Name</th><th>Category</th><th>Grade</th><th>Type</th><th>Unit</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400"><Boxes className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>No items yet. Load sample data from Dashboard.</p></td></tr>
            ) : (
              items.map((i) => (
                <tr key={i.id} data-testid={`item-row-${i.id}`}>
                  <td className="font-mono font-medium">{i.code}</td>
                  <td className="font-medium">{i.name}</td>
                  <td>{getCategoryName(i.category_id)}</td>
                  <td>{i.grade || '-'}</td>
                  <td>{i.type || '-'}</td>
                  <td>{i.unit}</td>
                  <td><Badge className={i.is_active ? 'status-active' : 'status-cancelled'}>{i.is_active ? 'Active' : 'Inactive'}</Badge></td>
                  <td><div className="flex gap-2"><Button size="sm" variant="ghost" onClick={() => handleEdit(i)}><Edit2 className="w-4 h-4" /></Button><Button size="sm" variant="ghost" onClick={() => handleDelete(i.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button></div></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
