import { useState, useEffect } from 'react';
import { incomeAPI, chartOfAccountsAPI } from '../../lib/api';
import { formatCurrency, formatDate, toISODateString } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Loader2, TrendingUp, Wallet, Calendar } from 'lucide-react';

export default function IncomePage() {
  const [incomeEntries, setIncomeEntries] = useState([]);
  const [incomeAccounts, setIncomeAccounts] = useState([]);
  const [paymentAccounts, setPaymentAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    income_date: toISODateString(new Date()),
    income_account_id: '',
    income_account_code: '',
    income_account_name: '',
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
      const [incRes, accRes] = await Promise.all([
        incomeAPI.list(),
        chartOfAccountsAPI.list()
      ]);
      setIncomeEntries(incRes.data || []);
      
      const accounts = accRes.data || [];
      setIncomeAccounts(accounts.filter(a => a.account_type === 'income' && !a.is_header));
      setPaymentAccounts(accounts.filter(a => 
        a.account_type === 'asset' && 
        !a.is_header && 
        (a.account_name.toLowerCase().includes('cash') || a.account_name.toLowerCase().includes('bank'))
      ));
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const openDialog = () => {
    setFormData({
      income_date: toISODateString(new Date()),
      income_account_id: '',
      income_account_code: '',
      income_account_name: '',
      amount: '',
      payment_method: 'cash',
      payment_account_id: '',
      payment_account_name: '',
      reference_number: '',
      description: ''
    });
    setDialogOpen(true);
  };

  const handleIncomeAccountChange = (accountId) => {
    const account = incomeAccounts.find(a => a.id === accountId);
    setFormData({
      ...formData,
      income_account_id: accountId,
      income_account_code: account?.account_code || '',
      income_account_name: account?.account_name || ''
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
    if (!formData.income_account_id || !formData.payment_account_id || !formData.amount) {
      toast.error('Please fill all required fields');
      return;
    }

    setSaving(true);
    try {
      await incomeAPI.create({
        ...formData,
        amount: parseFloat(formData.amount)
      });
      toast.success('Income recorded and journal entry created');
      setDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save income');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="income-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
            Income Entries
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Record manual income with automatic journal entries
          </p>
        </div>
        <Button onClick={openDialog} className="btn-accent">
          <Plus className="w-4 h-4 mr-2" />
          New Income
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Entries</p>
              <p className="text-xl font-bold">{incomeEntries.length}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
              <Wallet className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Income</p>
              <p className="text-xl font-bold text-emerald-600">
                {formatCurrency(incomeEntries.reduce((sum, e) => sum + (e.amount || 0), 0))}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">This Month</p>
              <p className="text-xl font-bold">
                {formatCurrency(incomeEntries
                  .filter(e => e.income_date?.startsWith(new Date().toISOString().slice(0, 7)))
                  .reduce((sum, e) => sum + (e.amount || 0), 0)
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Income Table */}
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Entry #</th>
              <th>Date</th>
              <th>Income Account</th>
              <th>Payment Method</th>
              <th className="text-right">Amount</th>
              <th>Description</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {incomeEntries.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-8 text-slate-500">
                  No income recorded yet
                </td>
              </tr>
            ) : (
              incomeEntries.map((inc) => (
                <tr key={inc.id}>
                  <td className="font-mono font-medium">{inc.entry_number}</td>
                  <td>{formatDate(inc.income_date)}</td>
                  <td>
                    <span className="font-mono text-xs text-slate-500">{inc.income_account_code}</span>
                    <span className="ml-2">{inc.income_account_name}</span>
                  </td>
                  <td>
                    <Badge className={inc.payment_method === 'cash' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                      {inc.payment_method}
                    </Badge>
                  </td>
                  <td className="text-right font-mono font-bold text-emerald-600">
                    {formatCurrency(inc.amount)}
                  </td>
                  <td className="max-w-xs truncate">{inc.description}</td>
                  <td>
                    <Badge className="bg-emerald-100 text-emerald-800">Posted</Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New Income Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              Record New Income
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Income Date *</Label>
                <Input
                  type="date"
                  value={formData.income_date}
                  onChange={(e) => setFormData({ ...formData, income_date: e.target.value })}
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
              <Label>Income Account *</Label>
              <Select value={formData.income_account_id} onValueChange={handleIncomeAccountChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select income account" />
                </SelectTrigger>
                <SelectContent>
                  {incomeAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.account_code} - {acc.account_name}
                    </SelectItem>
                  ))}
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
                <Label>Receiving Account *</Label>
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
                placeholder="Receipt/Invoice number"
              />
            </div>
            
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Income details..."
                rows={2}
              />
            </div>
            
            {/* Journal Preview */}
            {formData.income_account_id && formData.payment_account_id && formData.amount && (
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                <p className="text-xs font-medium text-slate-500 mb-2">Auto Journal Entry Preview:</p>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Dr. {formData.payment_account_name}</span>
                    <span className="font-mono">{formatCurrency(parseFloat(formData.amount) || 0)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span className="pl-4">Cr. {formData.income_account_name}</span>
                    <span className="font-mono">{formatCurrency(parseFloat(formData.amount) || 0)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Record Income
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
