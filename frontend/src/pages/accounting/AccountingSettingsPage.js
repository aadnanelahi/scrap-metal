import { useState, useEffect } from 'react';
import { accountSettingsAPI, chartOfAccountsAPI } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Settings, Calendar, Wallet, Lock, Building, Save, AlertTriangle } from 'lucide-react';

export default function AccountingSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    fiscal_year_start: '01-01',
    fiscal_year_end: '12-31',
    current_fiscal_year: new Date().getFullYear(),
    base_currency: 'AED',
    period_lock_date: '',
    period_lock_enabled: false,
    default_cash_account_id: 'none',
    default_bank_account_id: 'none',
    default_receivable_account_id: 'none',
    default_payable_account_id: 'none',
    default_sales_account_id: 'none',
    default_cogs_account_id: 'none',
    default_inventory_account_id: 'none'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsRes, accountsRes] = await Promise.all([
        accountSettingsAPI.get(),
        chartOfAccountsAPI.list()
      ]);
      
      const settingsData = settingsRes.data || {};
      setSettings(settingsData);
      setFormData({
        fiscal_year_start: settingsData.fiscal_year_start || '01-01',
        fiscal_year_end: settingsData.fiscal_year_end || '12-31',
        current_fiscal_year: settingsData.current_fiscal_year || new Date().getFullYear(),
        base_currency: settingsData.base_currency || 'AED',
        period_lock_date: settingsData.period_lock_date || '',
        period_lock_enabled: !!settingsData.period_lock_date,
        default_cash_account_id: settingsData.default_cash_account_id || 'none',
        default_bank_account_id: settingsData.default_bank_account_id || 'none',
        default_receivable_account_id: settingsData.default_receivable_account_id || 'none',
        default_payable_account_id: settingsData.default_payable_account_id || 'none',
        default_sales_account_id: settingsData.default_sales_account_id || 'none',
        default_cogs_account_id: settingsData.default_cogs_account_id || 'none',
        default_inventory_account_id: settingsData.default_inventory_account_id || 'none'
      });
      
      setAccounts(accountsRes.data?.filter(a => !a.is_header) || []);
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const dataToSave = {
        ...formData,
        period_lock_date: formData.period_lock_enabled ? formData.period_lock_date : null,
        // Convert "none" values back to empty strings/null for storage
        default_cash_account_id: formData.default_cash_account_id === 'none' ? null : formData.default_cash_account_id,
        default_bank_account_id: formData.default_bank_account_id === 'none' ? null : formData.default_bank_account_id,
        default_receivable_account_id: formData.default_receivable_account_id === 'none' ? null : formData.default_receivable_account_id,
        default_payable_account_id: formData.default_payable_account_id === 'none' ? null : formData.default_payable_account_id,
        default_sales_account_id: formData.default_sales_account_id === 'none' ? null : formData.default_sales_account_id,
        default_cogs_account_id: formData.default_cogs_account_id === 'none' ? null : formData.default_cogs_account_id,
        default_inventory_account_id: formData.default_inventory_account_id === 'none' ? null : formData.default_inventory_account_id,
      };
      delete dataToSave.period_lock_enabled;
      
      await accountSettingsAPI.update(dataToSave);
      toast.success('Accounting settings saved successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const getAccountsByType = (types) => {
    return accounts.filter(a => types.includes(a.account_type));
  };

  const fiscalYearMonths = [
    { value: '01-01', label: 'January 1' },
    { value: '04-01', label: 'April 1' },
    { value: '07-01', label: 'July 1' },
    { value: '10-01', label: 'October 1' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl" data-testid="accounting-settings-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-emerald-600" />
            Accounting Settings
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Configure fiscal year, default accounts, and period controls
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="btn-accent">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Settings
        </Button>
      </div>

      {/* Fiscal Year Settings */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-600" />
          Fiscal Year Configuration
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Fiscal Year Start</Label>
            <Select 
              value={formData.fiscal_year_start} 
              onValueChange={(v) => {
                const startMonth = parseInt(v.split('-')[0]);
                const endMonth = startMonth === 1 ? 12 : startMonth - 1;
                const endDay = endMonth === 12 ? '31' : '30';
                setFormData({
                  ...formData, 
                  fiscal_year_start: v,
                  fiscal_year_end: `${String(endMonth).padStart(2, '0')}-${endDay}`
                });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fiscalYearMonths.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-1">When your fiscal year begins</p>
          </div>
          
          <div>
            <Label>Fiscal Year End</Label>
            <Input 
              value={formData.fiscal_year_end} 
              disabled 
              className="bg-slate-100"
            />
            <p className="text-xs text-slate-500 mt-1">Auto-calculated from start date</p>
          </div>
          
          <div>
            <Label>Current Fiscal Year</Label>
            <Select 
              value={String(formData.current_fiscal_year)} 
              onValueChange={(v) => setFormData({...formData, current_fiscal_year: parseInt(v)})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027, 2028].map(year => (
                  <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-1">Active fiscal year for reporting</p>
          </div>
        </div>
      </div>

      {/* Period Lock Settings */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-orange-600" />
          Period Lock
        </h2>
        
        <div className="flex items-start gap-4 mb-4">
          <Switch
            checked={formData.period_lock_enabled}
            onCheckedChange={(checked) => setFormData({...formData, period_lock_enabled: checked})}
          />
          <div>
            <p className="font-medium">Enable Period Lock</p>
            <p className="text-sm text-slate-500">Prevent journal entries before the lock date</p>
          </div>
        </div>
        
        {formData.period_lock_enabled && (
          <div className="pl-12">
            <div className="max-w-xs">
              <Label>Lock Date</Label>
              <Input
                type="date"
                value={formData.period_lock_date}
                onChange={(e) => setFormData({...formData, period_lock_date: e.target.value})}
              />
              <p className="text-xs text-slate-500 mt-1">
                Entries before this date cannot be created or modified
              </p>
            </div>
            
            {formData.period_lock_date && (
              <div className="mt-3 flex items-center gap-2 text-orange-600 bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">
                  All periods before {formData.period_lock_date} will be locked
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Default Accounts */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Wallet className="w-5 h-5 text-emerald-600" />
          Default Accounts
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Set default accounts for automatic journal entries and transactions
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cash & Bank */}
          <div>
            <Label>Default Cash Account</Label>
            <Select 
              value={formData.default_cash_account_id} 
              onValueChange={(v) => setFormData({...formData, default_cash_account_id: v})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select cash account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- None --</SelectItem>
                {getAccountsByType(['asset']).filter(a => 
                  a.account_name.toLowerCase().includes('cash')
                ).map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.account_code} - {acc.account_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Default Bank Account</Label>
            <Select 
              value={formData.default_bank_account_id} 
              onValueChange={(v) => setFormData({...formData, default_bank_account_id: v})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select bank account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- None --</SelectItem>
                {getAccountsByType(['asset']).filter(a => 
                  a.account_name.toLowerCase().includes('bank')
                ).map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.account_code} - {acc.account_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Receivable & Payable */}
          <div>
            <Label>Default Receivable Account</Label>
            <Select 
              value={formData.default_receivable_account_id} 
              onValueChange={(v) => setFormData({...formData, default_receivable_account_id: v})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select receivable account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- None --</SelectItem>
                {getAccountsByType(['asset']).filter(a => 
                  a.account_name.toLowerCase().includes('receivable')
                ).map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.account_code} - {acc.account_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Default Payable Account</Label>
            <Select 
              value={formData.default_payable_account_id} 
              onValueChange={(v) => setFormData({...formData, default_payable_account_id: v})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payable account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- None --</SelectItem>
                {getAccountsByType(['liability']).filter(a => 
                  a.account_name.toLowerCase().includes('payable')
                ).map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.account_code} - {acc.account_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Sales & COGS */}
          <div>
            <Label>Default Sales Account</Label>
            <Select 
              value={formData.default_sales_account_id} 
              onValueChange={(v) => setFormData({...formData, default_sales_account_id: v})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select sales account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- None --</SelectItem>
                {getAccountsByType(['income']).map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.account_code} - {acc.account_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Default COGS Account</Label>
            <Select 
              value={formData.default_cogs_account_id} 
              onValueChange={(v) => setFormData({...formData, default_cogs_account_id: v})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select COGS account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- None --</SelectItem>
                {getAccountsByType(['cogs']).map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.account_code} - {acc.account_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Inventory */}
          <div className="md:col-span-2">
            <Label>Default Inventory Account</Label>
            <Select 
              value={formData.default_inventory_account_id} 
              onValueChange={(v) => setFormData({...formData, default_inventory_account_id: v})}
            >
              <SelectTrigger className="max-w-md">
                <SelectValue placeholder="Select inventory account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- None --</SelectItem>
                {getAccountsByType(['asset']).filter(a => 
                  a.account_name.toLowerCase().includes('inventory')
                ).map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.account_code} - {acc.account_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Base Currency */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Building className="w-5 h-5 text-purple-600" />
          Base Currency
        </h2>
        
        <div className="max-w-xs">
          <Label>Base Currency</Label>
          <Select 
            value={formData.base_currency} 
            onValueChange={(v) => setFormData({...formData, base_currency: v})}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AED">AED - UAE Dirham</SelectItem>
              <SelectItem value="USD">USD - US Dollar</SelectItem>
              <SelectItem value="EUR">EUR - Euro</SelectItem>
              <SelectItem value="GBP">GBP - British Pound</SelectItem>
              <SelectItem value="SAR">SAR - Saudi Riyal</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500 mt-1">
            All transactions will be converted to this currency for reporting
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg" className="btn-accent">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save All Settings
        </Button>
      </div>
    </div>
  );
}
