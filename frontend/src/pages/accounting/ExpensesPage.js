import { useState, useEffect } from 'react';
import { expensesAPI, chartOfAccountsAPI, companiesAPI } from '../../lib/api';
import { formatCurrency, formatDate, toISODateString, printDocument } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Loader2, Receipt, Wallet, Building, Printer, Trash2, Pencil } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [expenseAccounts, setExpenseAccounts] = useState([]);
  const [paymentAccounts, setPaymentAccounts] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const isAdmin = user?.role === 'admin';
  
  const [formData, setFormData] = useState({
    expense_date: toISODateString(new Date()),
    expense_account_id: '',
    expense_account_code: '',
    expense_account_name: '',
    amount: '',
    payment_method: 'cash',
    payment_account_id: '',
    payment_account_name: '',
    reference_number: '',
    description: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [expRes, accRes, companiesRes] = await Promise.all([
        expensesAPI.list(),
        chartOfAccountsAPI.list(),
        companiesAPI.list()
      ]);
      setExpenses(expRes.data || []);
      
      const accounts = accRes.data || [];
      // Include ALL account types for expense recording (user requested all COA heads)
      // Group by account type for easier selection
      const allTypes = ['cogs', 'expense', 'asset', 'liability', 'equity', 'income'];
      setExpenseAccounts(accounts.filter(a => 
        allTypes.includes(a.account_type) && !a.is_header
      ).sort((a, b) => {
        // Sort by type first, then by code
        const typeOrder = { cogs: 1, expense: 2, asset: 3, liability: 4, equity: 5, income: 6 };
        const typeCompare = (typeOrder[a.account_type] || 99) - (typeOrder[b.account_type] || 99);
        if (typeCompare !== 0) return typeCompare;
        return a.account_code.localeCompare(b.account_code);
      }));
      
      setPaymentAccounts(accounts.filter(a => 
        a.account_type === 'asset' && 
        !a.is_header && 
        (a.account_name.toLowerCase().includes('cash') || a.account_name.toLowerCase().includes('bank'))
      ));
      
      const companies = companiesRes.data || [];
      setCompany(companies.find(c => c.is_active) || companies[0] || null);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleExpenseAccountChange = (accountId) => {
    const account = expenseAccounts.find(a => a.id === accountId);
    setFormData({
      ...formData,
      expense_account_id: accountId,
      expense_account_code: account?.account_code || '',
      expense_account_name: account?.account_name || ''
    });
  };

  const handlePaymentAccountChange = (accountId) => {
    const account = paymentAccounts.find(a => a.id === accountId);
    setFormData({
      ...formData,
      payment_account_id: accountId,
      payment_account_name: account?.account_name || ''
    });
  };

  const handleSave = async () => {
    if (!formData.expense_account_id || !formData.payment_account_id || !formData.amount) {
      toast.error('Please fill all required fields');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await expensesAPI.update(editingId, {
          ...formData,
          amount: parseFloat(formData.amount)
        });
        toast.success('Expense updated');
      } else {
        await expensesAPI.create({
          ...formData,
          amount: parseFloat(formData.amount)
        });
        toast.success('Expense recorded and journal entry created');
      }
      setDialogOpen(false);
      setEditingId(null);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (expense) => {
    setEditingId(expense.id);
    setFormData({
      expense_date: expense.expense_date || toISODateString(new Date()),
      expense_account_id: expense.expense_account_id || '',
      expense_account_code: expense.expense_account_code || '',
      expense_account_name: expense.expense_account_name || '',
      amount: expense.amount || '',
      payment_method: expense.payment_method || 'cash',
      payment_account_id: expense.payment_account_id || '',
      payment_account_name: expense.payment_account_name || '',
      reference_number: expense.reference_number || '',
      description: expense.description || ''
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      expense_date: toISODateString(new Date()),
      expense_account_id: '',
      expense_account_code: '',
      expense_account_name: '',
      amount: '',
      payment_method: 'cash',
      payment_account_id: '',
      payment_account_name: '',
      reference_number: '',
      description: ''
    });
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await expensesAPI.delete(deleteId);
      toast.success('Expense entry and related journal entry deleted');
      setDeleteDialogOpen(false);
      setDeleteId(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const handlePrintVoucher = (expense) => {
    const companyName = company?.name || 'ScrapOS Trading LLC';
    const companyLogo = company?.logo || '';
    const companyAddress = company?.address || '';
    const companyPhone = company?.phone || '';
    const companyEmail = company?.email || '';
    const logoHTML = companyLogo ? `<img src="${companyLogo}" alt="${companyName}" style="max-height:70px;max-width:180px;object-fit:contain;margin-bottom:10px;" />` : '';
    
    const html = `
      <div style="text-align:center;margin-bottom:30px;">
        ${logoHTML}
        <h2 style="margin:0;font-size:18px;">${companyName}</h2>
        ${companyAddress ? `<p style="margin:5px 0;font-size:11px;color:#666;">${companyAddress}</p>` : ''}
        ${companyPhone || companyEmail ? `<p style="margin:5px 0;font-size:11px;color:#666;">${[companyPhone, companyEmail].filter(Boolean).join(' | ')}</p>` : ''}
        <h1 style="margin:15px 0 0;font-size:20px;border-top:2px solid #1e293b;padding-top:15px;">EXPENSE VOUCHER</h1>
      </div>
      
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr>
          <td style="padding:8px;border:1px solid #e2e8f0;width:30%;background:#f8fafc;font-weight:600;">Voucher No.</td>
          <td style="padding:8px;border:1px solid #e2e8f0;">${expense.entry_number}</td>
          <td style="padding:8px;border:1px solid #e2e8f0;width:20%;background:#f8fafc;font-weight:600;">Date</td>
          <td style="padding:8px;border:1px solid #e2e8f0;">${formatDate(expense.expense_date)}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;">Expense Account</td>
          <td style="padding:8px;border:1px solid #e2e8f0;" colspan="3">${expense.expense_account_code} - ${expense.expense_account_name}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;">Payment Method</td>
          <td style="padding:8px;border:1px solid #e2e8f0;">${expense.payment_method?.toUpperCase()}</td>
          <td style="padding:8px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;">Payment Account</td>
          <td style="padding:8px;border:1px solid #e2e8f0;">${expense.payment_account_name}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;">Reference No.</td>
          <td style="padding:8px;border:1px solid #e2e8f0;" colspan="3">${expense.reference_number || '-'}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;">Description</td>
          <td style="padding:8px;border:1px solid #e2e8f0;" colspan="3">${expense.description || '-'}</td>
        </tr>
      </table>
      
      <table style="width:100%;border-collapse:collapse;margin-bottom:30px;">
        <tr style="background:#1e293b;color:white;">
          <th style="padding:12px;text-align:left;">Account</th>
          <th style="padding:12px;text-align:right;">Debit (AED)</th>
          <th style="padding:12px;text-align:right;">Credit (AED)</th>
        </tr>
        <tr>
          <td style="padding:10px;border:1px solid #e2e8f0;">${expense.expense_account_code} - ${expense.expense_account_name}</td>
          <td style="padding:10px;border:1px solid #e2e8f0;text-align:right;font-weight:bold;">${formatCurrency(expense.amount)}</td>
          <td style="padding:10px;border:1px solid #e2e8f0;text-align:right;">-</td>
        </tr>
        <tr>
          <td style="padding:10px;border:1px solid #e2e8f0;">${expense.payment_account_name}</td>
          <td style="padding:10px;border:1px solid #e2e8f0;text-align:right;">-</td>
          <td style="padding:10px;border:1px solid #e2e8f0;text-align:right;font-weight:bold;">${formatCurrency(expense.amount)}</td>
        </tr>
        <tr style="background:#f8fafc;font-weight:bold;">
          <td style="padding:10px;border:1px solid #e2e8f0;">TOTAL</td>
          <td style="padding:10px;border:1px solid #e2e8f0;text-align:right;">${formatCurrency(expense.amount)}</td>
          <td style="padding:10px;border:1px solid #e2e8f0;text-align:right;">${formatCurrency(expense.amount)}</td>
        </tr>
      </table>
      
      <div style="display:flex;justify-content:space-between;margin-top:60px;">
        <div style="text-align:center;width:30%;">
          <div style="border-top:1px solid #333;padding-top:10px;">Prepared By</div>
        </div>
        <div style="text-align:center;width:30%;">
          <div style="border-top:1px solid #333;padding-top:10px;">Approved By</div>
        </div>
        <div style="text-align:center;width:30%;">
          <div style="border-top:1px solid #333;padding-top:10px;">Received By</div>
        </div>
      </div>
    `;
    printDocument(html, `Expense-Voucher-${expense.entry_number}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="expenses-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-6 h-6 text-red-600" />
            Expense Entries
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Record expenses with automatic journal entries
          </p>
        </div>
        <Button onClick={() => { resetForm(); setEditingId(null); setDialogOpen(true); }} className="btn-accent">
          <Plus className="w-4 h-4 mr-2" />
          New Expense
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
              <Receipt className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Entries</p>
              <p className="text-xl font-bold">{expenses.length}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full">
              <Wallet className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Amount</p>
              <p className="text-xl font-bold">
                {formatCurrency(expenses.reduce((sum, e) => sum + (e.amount || 0), 0))}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <Building className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">This Month</p>
              <p className="text-xl font-bold">
                {formatCurrency(expenses
                  .filter(e => e.expense_date?.startsWith(new Date().toISOString().slice(0, 7)))
                  .reduce((sum, e) => sum + (e.amount || 0), 0)
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Entry #</th>
              <th>Date</th>
              <th>Expense Account</th>
              <th>Payment Method</th>
              <th className="text-right">Amount</th>
              <th>Description</th>
              <th>Status</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-8 text-slate-500">
                  No expenses recorded yet
                </td>
              </tr>
            ) : (
              expenses.map((exp) => (
                <tr key={exp.id}>
                  <td className="font-mono font-medium">{exp.entry_number}</td>
                  <td>{formatDate(exp.expense_date)}</td>
                  <td>
                    <span className="font-mono text-xs text-slate-500">{exp.expense_account_code}</span>
                    <span className="ml-2">{exp.expense_account_name}</span>
                  </td>
                  <td>
                    <Badge className={exp.payment_method === 'cash' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                      {exp.payment_method}
                    </Badge>
                  </td>
                  <td className="text-right font-mono font-bold text-red-600">
                    {formatCurrency(exp.amount)}
                  </td>
                  <td className="max-w-xs truncate">{exp.description}</td>
                  <td>
                    <Badge className="bg-emerald-100 text-emerald-800">Posted</Badge>
                  </td>
                  <td className="text-center">
                    <div className="flex gap-1 justify-center">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handlePrintVoucher(exp)}
                        title="Print Voucher"
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                      {isAdmin && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(exp)}
                            title="Edit expense"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => { setDeleteId(exp.id); setDeleteDialogOpen(true); }}
                            title="Delete permanently"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Dialog - Admin Only */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Permanently Delete Expense</DialogTitle>
            <DialogDescription>
              This will permanently delete the expense entry and its related journal entry.
              Account balances will be reversed.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">
              Are you sure you want to delete this expense entry?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New/Edit Expense Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingId(null); resetForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-red-600" />
              {editingId ? 'Edit Expense' : 'Record New Expense'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Expense Date *</Label>
                <Input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div>
              <Label>Debit Account * (All COA Accounts)</Label>
              <Select value={formData.expense_account_id} onValueChange={handleExpenseAccountChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account to debit" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {/* COGS Section */}
                  {expenseAccounts.filter(a => a.account_type === 'cogs').length > 0 && (
                    <>
                      <SelectItem value="__header_cogs" disabled className="font-bold bg-amber-50 dark:bg-amber-900/30 text-amber-700">
                        ── COST OF GOODS SOLD ──
                      </SelectItem>
                      {expenseAccounts.filter(a => a.account_type === 'cogs').map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>
                          <span className="font-mono text-xs text-slate-500 mr-2">{acc.account_code}</span>
                          {acc.account_name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  
                  {/* Expenses Section */}
                  {expenseAccounts.filter(a => a.account_type === 'expense').length > 0 && (
                    <>
                      <SelectItem value="__header_expense" disabled className="font-bold bg-red-50 dark:bg-red-900/30 text-red-700">
                        ── EXPENSES ──
                      </SelectItem>
                      {expenseAccounts.filter(a => a.account_type === 'expense').map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>
                          <span className="font-mono text-xs text-slate-500 mr-2">{acc.account_code}</span>
                          {acc.account_name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  
                  {/* Assets Section */}
                  {expenseAccounts.filter(a => a.account_type === 'asset').length > 0 && (
                    <>
                      <SelectItem value="__header_asset" disabled className="font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-700">
                        ── ASSETS ──
                      </SelectItem>
                      {expenseAccounts.filter(a => a.account_type === 'asset').map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>
                          <span className="font-mono text-xs text-slate-500 mr-2">{acc.account_code}</span>
                          {acc.account_name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  
                  {/* Liabilities Section */}
                  {expenseAccounts.filter(a => a.account_type === 'liability').length > 0 && (
                    <>
                      <SelectItem value="__header_liability" disabled className="font-bold bg-purple-50 dark:bg-purple-900/30 text-purple-700">
                        ── LIABILITIES ──
                      </SelectItem>
                      {expenseAccounts.filter(a => a.account_type === 'liability').map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>
                          <span className="font-mono text-xs text-slate-500 mr-2">{acc.account_code}</span>
                          {acc.account_name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  
                  {/* Equity Section */}
                  {expenseAccounts.filter(a => a.account_type === 'equity').length > 0 && (
                    <>
                      <SelectItem value="__header_equity" disabled className="font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700">
                        ── EQUITY ──
                      </SelectItem>
                      {expenseAccounts.filter(a => a.account_type === 'equity').map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>
                          <span className="font-mono text-xs text-slate-500 mr-2">{acc.account_code}</span>
                          {acc.account_name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  
                  {/* Income Section */}
                  {expenseAccounts.filter(a => a.account_type === 'income').length > 0 && (
                    <>
                      <SelectItem value="__header_income" disabled className="font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700">
                        ── INCOME ──
                      </SelectItem>
                      {expenseAccounts.filter(a => a.account_type === 'income').map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>
                          <span className="font-mono text-xs text-slate-500 mr-2">{acc.account_code}</span>
                          {acc.account_name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Payment Method *</Label>
                <Select value={formData.payment_method} onValueChange={(v) => setFormData({ ...formData, payment_method: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Payment Account *</Label>
                <Select value={formData.payment_account_id} onValueChange={handlePaymentAccountChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentAccounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.account_code} - {acc.account_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>Reference Number</Label>
              <Input
                value={formData.reference_number}
                onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                placeholder="Invoice/Receipt number"
              />
            </div>
            
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Expense details..."
                rows={2}
              />
            </div>
            
            {/* Journal Preview */}
            {formData.expense_account_id && formData.payment_account_id && formData.amount && (
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                <p className="text-xs font-medium text-slate-500 mb-2">Auto Journal Entry Preview:</p>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Dr. {formData.expense_account_name}</span>
                    <span className="font-mono">{formatCurrency(parseFloat(formData.amount) || 0)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span className="pl-4">Cr. {formData.payment_account_name}</span>
                    <span className="font-mono">{formatCurrency(parseFloat(formData.amount) || 0)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-red-600 hover:bg-red-700">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Record Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
