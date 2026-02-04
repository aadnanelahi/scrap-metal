import { useState, useEffect } from 'react';
import { usersAPI } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Users, Loader2 } from 'lucide-react';

export default function UsersPage() {
  const { hasRole } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '', email: '', password: '', role: 'viewer'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await usersAPI.list();
      setUsers(res.data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.full_name || !formData.email || (!editing && !formData.password)) {
      toast.error('Please fill all required fields');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { password, ...updateData } = formData;
        await usersAPI.update(editing.id, updateData);
        toast.success('User updated');
      } else {
        await usersAPI.create(formData);
        toast.success('User created');
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

  const handleEdit = (user) => { setEditing(user); setFormData({ ...user, password: '' }); setShowDialog(true); };
  const handleDelete = async (id) => { if (!window.confirm('Deactivate this user?')) return; try { await usersAPI.delete(id); toast.success('User deactivated'); loadData(); } catch (error) { toast.error('Failed to delete'); } };
  const resetForm = () => { setEditing(null); setFormData({ full_name: '', email: '', password: '', role: 'viewer' }); };

  const getRoleBadgeClass = (role) => {
    const classes = { admin: 'status-cancelled', manager: 'status-posted', accountant: 'status-active', weighbridge_operator: 'status-pending', sales: 'status-active', purchase: 'status-active', viewer: 'status-draft' };
    return classes[role] || 'status-draft';
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="users-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white">Users</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Manage system users and roles</p>
        </div>
        {hasRole(['admin', 'manager']) && (
          <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild><Button className="btn-accent gap-2" data-testid="new-user-btn"><Plus className="w-4 h-4" />New User</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-manrope">{editing ? 'Edit' : 'New'} User</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <div><Label className="form-label">Full Name</Label><Input value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} className="form-input" data-testid="user-name-input" /></div>
                <div><Label className="form-label">Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="form-input" data-testid="user-email-input" /></div>
                {!editing && <div><Label className="form-label">Password</Label><Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="form-input" data-testid="user-password-input" /></div>}
                <div><Label className="form-label">Role</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                    <SelectTrigger className="form-input" data-testid="user-role-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="accountant">Accountant</SelectItem>
                      <SelectItem value="weighbridge_operator">Weighbridge Operator</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="purchase">Purchase</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSave} disabled={saving} className="w-full btn-accent" data-testid="user-save-btn">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <div className="kpi-card p-0 overflow-hidden">
        <table className="erp-table" data-testid="users-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Created</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-slate-400"><Users className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>No users yet</p></td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} data-testid={`user-row-${u.id}`}>
                  <td className="font-medium">{u.full_name}</td>
                  <td>{u.email}</td>
                  <td><Badge className={`${getRoleBadgeClass(u.role)} capitalize`}>{u.role?.replace('_', ' ')}</Badge></td>
                  <td className="text-sm text-slate-500">{formatDateTime(u.created_at)}</td>
                  <td><Badge className={u.is_active ? 'status-active' : 'status-cancelled'}>{u.is_active ? 'Active' : 'Inactive'}</Badge></td>
                  <td>
                    {hasRole(['admin', 'manager']) && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(u)}><Edit2 className="w-4 h-4" /></Button>
                        {hasRole('admin') && <Button size="sm" variant="ghost" onClick={() => handleDelete(u.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
