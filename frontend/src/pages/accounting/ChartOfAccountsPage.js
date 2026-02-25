import { useState, useEffect } from 'react';
import { chartOfAccountsAPI } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, BookOpen, ChevronRight, FolderTree } from 'lucide-react';

const ACCOUNT_TYPES = [
  { value: 'asset', label: 'Asset', color: 'bg-blue-100 text-blue-800' },
  { value: 'liability', label: 'Liability', color: 'bg-red-100 text-red-800' },
  { value: 'equity', label: 'Equity', color: 'bg-purple-100 text-purple-800' },
  { value: 'income', label: 'Income', color: 'bg-green-100 text-green-800' },
  { value: 'cogs', label: 'COGS', color: 'bg-orange-100 text-orange-800' },
  { value: 'expense', label: 'Expense', color: 'bg-yellow-100 text-yellow-800' },
];

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState('all');
  
  const [formData, setFormData] = useState({
    account_code: '',
    account_name: '',
    account_type: 'expense',
    parent_account_id: '',
    description: '',
    is_header: false,
    is_active: true
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const res = await chartOfAccountsAPI.list({ is_active: null });
      setAccounts(res.data || []);
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.detail?.includes('No company')) {
        toast.info('Please initialize Chart of Accounts first');
      } else {
        toast.error('Failed to load accounts');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    try {
      await chartOfAccountsAPI.initialize();
      toast.success('Chart of Accounts initialized successfully');
      loadAccounts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to initialize');
    }
  };

  const openCreateDialog = () => {
    setEditingAccount(null);
    setFormData({
      account_code: '',
      account_name: '',
      account_type: 'expense',
      parent_account_id: '',
      description: '',
      is_header: false,
      is_active: true
    });
    setDialogOpen(true);
  };

  const openEditDialog = (account) => {
    setEditingAccount(account);
    setFormData({
      account_code: account.account_code,
      account_name: account.account_name,
      account_type: account.account_type,
      parent_account_id: account.parent_account_id || '',
      description: account.description || '',
      is_header: account.is_header || false,
      is_active: account.is_active
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.account_code || !formData.account_name) {
      toast.error('Account code and name are required');
      return;
    }

    setSaving(true);
    try {
      if (editingAccount) {
        await chartOfAccountsAPI.update(editingAccount.id, formData);
        toast.success('Account updated');
      } else {
        await chartOfAccountsAPI.create(formData);
        toast.success('Account created');
      }
      setDialogOpen(false);
      loadAccounts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save account');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (account) => {
    if (!confirm(`Delete account "${account.account_name}"?`)) return;
    
    try {
      await chartOfAccountsAPI.delete(account.id);
      toast.success('Account deleted');
      loadAccounts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete account');
    }
  };

  const getTypeColor = (type) => {
    return ACCOUNT_TYPES.find(t => t.value === type)?.color || 'bg-gray-100 text-gray-800';
  };

  const filteredAccounts = filterType === 'all' 
    ? accounts 
    : accounts.filter(a => a.account_type === filterType);

  // Build hierarchy view
  const buildHierarchy = (accounts) => {
    const map = {};
    const roots = [];
    
    accounts.forEach(acc => {
      map[acc.id] = { ...acc, children: [] };
    });
    
    accounts.forEach(acc => {
      if (acc.parent_account_id && map[acc.parent_account_id]) {
        map[acc.parent_account_id].children.push(map[acc.id]);
      } else {
        roots.push(map[acc.id]);
      }
    });
    
    return roots;
  };

  const renderAccountRow = (account, level = 0) => {
    const indent = level * 24;
    return (
      <tr key={account.id} className={account.is_header ? 'bg-slate-50 dark:bg-slate-800/50 font-semibold' : ''}>
        <td style={{ paddingLeft: `${indent + 16}px` }} className="font-mono">
          {level > 0 && <ChevronRight className="w-3 h-3 inline mr-1 text-slate-400" />}
          {account.account_code}
        </td>
        <td className={account.is_header ? 'font-semibold' : ''}>
          {account.is_header && <FolderTree className="w-4 h-4 inline mr-2 text-slate-500" />}
          {account.account_name}
        </td>
        <td>
          <Badge className={`${getTypeColor(account.account_type)} text-xs`}>
            {account.account_type}
          </Badge>
        </td>
        <td className="text-right font-mono">
          {account.current_balance?.toFixed(2) || '0.00'}
        </td>
        <td>
          <Badge className={account.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
            {account.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </td>
        <td>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => openEditDialog(account)}>
              <Pencil className="w-4 h-4" />
            </Button>
            {!account.is_header && (
              <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDelete(account)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  const renderHierarchy = (nodes, level = 0) => {
    return nodes.flatMap(node => [
      renderAccountRow(node, level),
      ...renderHierarchy(node.children || [], level + 1)
    ]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-16">
        <BookOpen className="w-16 h-16 mx-auto text-slate-400 mb-4" />
        <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
          Chart of Accounts Not Initialized
        </h2>
        <p className="text-slate-500 mb-6">
          Initialize the default Chart of Accounts to get started with accounting.
        </p>
        <Button onClick={handleInitialize} className="btn-accent">
          <Plus className="w-4 h-4 mr-2" />
          Initialize Chart of Accounts
        </Button>
      </div>
    );
  }

  const hierarchy = buildHierarchy(filteredAccounts);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="chart-of-accounts-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-600" />
            Chart of Accounts
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage your company's accounting structure
          </p>
        </div>
        <Button onClick={openCreateDialog} className="btn-accent">
          <Plus className="w-4 h-4 mr-2" />
          Add Account
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Label>Filter by Type:</Label>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {ACCOUNT_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-slate-500">
          {filteredAccounts.length} accounts
        </span>
      </div>

      {/* Accounts Table */}
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Account Name</th>
              <th>Type</th>
              <th className="text-right">Balance</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {renderHierarchy(hierarchy)}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? 'Edit Account' : 'New Account'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Account Code *</Label>
                <Input
                  value={formData.account_code}
                  onChange={(e) => setFormData({ ...formData, account_code: e.target.value })}
                  placeholder="e.g., 6100"
                />
              </div>
              <div>
                <Label>Account Type *</Label>
                <Select value={formData.account_type} onValueChange={(v) => setFormData({ ...formData, account_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>Account Name *</Label>
              <Input
                value={formData.account_name}
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                placeholder="e.g., Office Supplies"
              />
            </div>
            
            <div>
              <Label>Parent Account (Optional)</Label>
              <Select 
                value={formData.parent_account_id || 'none'} 
                onValueChange={(v) => setFormData({ ...formData, parent_account_id: v === 'none' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Parent</SelectItem>
                  {accounts.filter(a => a.is_header).map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.account_code} - {a.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_header}
                  onChange={(e) => setFormData({ ...formData, is_header: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Header Account (Category)</span>
              </label>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Active</span>
              </label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingAccount ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
