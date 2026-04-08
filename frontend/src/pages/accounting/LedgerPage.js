import { useState, useEffect } from 'react';
import { accountingAPI, companiesAPI } from '../../lib/api';
import { formatCurrency, formatDate, toISODateString, printDocument } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Printer, Download, Banknote, Building2, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function CashLedgerPage() {
  return <LedgerPage accountCode="1110" accountName="Cash on Hand" icon={Banknote} />;
}

export function PettyCashLedgerPage() {
  return <LedgerPage accountCode="1130" accountName="Petty Cash" icon={Wallet} />;
}

export function BankLedgerPage() {
  return <LedgerPage accountCode="1120" accountName="Bank Account" icon={Building2} />;
}

function LedgerPage({ accountCode, accountName, icon: Icon }) {
  const [transactions, setTransactions] = useState([]);
  const [account, setAccount] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    start_date: toISODateString(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    end_date: toISODateString(new Date())
  });
  const [openingBalance, setOpeningBalance] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ledgerRes, companiesRes] = await Promise.all([
        accountingAPI.getLedger(accountCode, filters),
        companiesAPI.list()
      ]);
      
      setTransactions(ledgerRes.data?.transactions || []);
      setAccount(ledgerRes.data?.account || null);
      setOpeningBalance(ledgerRes.data?.opening_balance || 0);
      
      const companies = companiesRes.data || [];
      setCompany(companies.find(c => c.is_active) || companies[0] || null);
    } catch (error) {
      toast.error('Failed to load ledger data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    loadData();
  };

  // Calculate running balance
  const getTransactionsWithBalance = () => {
    let balance = openingBalance;
    return transactions.map(txn => {
      const debit = txn.debit_amount || 0;
      const credit = txn.credit_amount || 0;
      balance = balance + debit - credit;
      return { ...txn, running_balance: balance };
    });
  };

  const transactionsWithBalance = getTransactionsWithBalance();
  const closingBalance = transactionsWithBalance.length > 0 
    ? transactionsWithBalance[transactionsWithBalance.length - 1].running_balance 
    : openingBalance;
  
  const totalDebits = transactions.reduce((sum, t) => sum + (t.debit_amount || 0), 0);
  const totalCredits = transactions.reduce((sum, t) => sum + (t.credit_amount || 0), 0);

  const handlePrint = () => {
    const html = generateLedgerHTML();
    printDocument(html, `${accountName.replace(/\s+/g, '-')}-Ledger`);
  };

  const generateLedgerHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${accountName} Ledger</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 1000px; margin: 0 auto; font-size: 12px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
          .logo { max-height: 50px; margin-bottom: 10px; }
          .company-name { font-size: 20px; font-weight: bold; }
          .report-title { font-size: 16px; margin-top: 10px; color: #666; }
          .period { font-size: 12px; color: #888; margin-top: 5px; }
          .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
          .summary-box { padding: 12px; background: #f5f5f5; border-radius: 5px; text-align: center; }
          .summary-label { font-size: 10px; color: #666; text-transform: uppercase; }
          .summary-value { font-size: 16px; font-weight: bold; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f5f5f5; font-weight: bold; }
          .text-right { text-align: right; }
          .debit { color: #059669; }
          .credit { color: #dc2626; }
          .total-row { background: #f9f9f9; font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #888; }
        </style>
      </head>
      <body>
        <div class="header">
          ${company?.logo_url ? `<img src="${company.logo_url}" class="logo" alt="Logo">` : ''}
          <div class="company-name">${company?.name || 'Company'}</div>
          <div class="report-title">${accountName} Ledger (${accountCode})</div>
          <div class="period">Period: ${formatDate(filters.start_date)} to ${formatDate(filters.end_date)}</div>
        </div>
        
        <div class="summary">
          <div class="summary-box">
            <div class="summary-label">Opening Balance</div>
            <div class="summary-value">${formatCurrency(openingBalance)}</div>
          </div>
          <div class="summary-box">
            <div class="summary-label">Total Debits</div>
            <div class="summary-value debit">${formatCurrency(totalDebits)}</div>
          </div>
          <div class="summary-box">
            <div class="summary-label">Total Credits</div>
            <div class="summary-value credit">${formatCurrency(totalCredits)}</div>
          </div>
          <div class="summary-box">
            <div class="summary-label">Closing Balance</div>
            <div class="summary-value">${formatCurrency(closingBalance)}</div>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Reference</th>
              <th>Description</th>
              <th class="text-right">Debit</th>
              <th class="text-right">Credit</th>
              <th class="text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${formatDate(filters.start_date)}</td>
              <td>—</td>
              <td><em>Opening Balance</em></td>
              <td class="text-right">—</td>
              <td class="text-right">—</td>
              <td class="text-right"><strong>${formatCurrency(openingBalance)}</strong></td>
            </tr>
            ${transactionsWithBalance.map(txn => `
              <tr>
                <td>${formatDate(txn.entry_date)}</td>
                <td>${txn.reference_number || txn.entry_number || '—'}</td>
                <td>${txn.description || '—'}</td>
                <td class="text-right debit">${txn.debit_amount ? formatCurrency(txn.debit_amount) : '—'}</td>
                <td class="text-right credit">${txn.credit_amount ? formatCurrency(txn.credit_amount) : '—'}</td>
                <td class="text-right"><strong>${formatCurrency(txn.running_balance)}</strong></td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="3"><strong>Totals</strong></td>
              <td class="text-right debit"><strong>${formatCurrency(totalDebits)}</strong></td>
              <td class="text-right credit"><strong>${formatCurrency(totalCredits)}</strong></td>
              <td class="text-right"><strong>${formatCurrency(closingBalance)}</strong></td>
            </tr>
          </tbody>
        </table>
        
        <div class="footer">
          Generated on ${new Date().toLocaleString()}
        </div>
      </body>
      </html>
    `;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid={`${accountCode}-ledger-page`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <Icon className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white">{accountName} Ledger</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Account Code: {accountCode}</p>
          </div>
        </div>
        <Button onClick={handlePrint} variant="outline" className="gap-2">
          <Printer className="w-4 h-4" />
          Print Ledger
        </Button>
      </div>

      {/* Filters */}
      <div className="kpi-card">
        <div className="flex items-end gap-4">
          <div>
            <Label className="form-label">From Date</Label>
            <Input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              className="form-input w-40"
            />
          </div>
          <div>
            <Label className="form-label">To Date</Label>
            <Input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              className="form-input w-40"
            />
          </div>
          <Button onClick={handleFilter} className="btn-accent">
            Apply Filter
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="kpi-card">
          <p className="text-xs font-bold uppercase text-slate-500">Opening Balance</p>
          <p className="text-2xl font-mono font-bold text-slate-700 dark:text-slate-200">
            {formatCurrency(openingBalance)}
          </p>
        </div>
        <div className="kpi-card">
          <p className="text-xs font-bold uppercase text-slate-500">Total Debits (In)</p>
          <p className="text-2xl font-mono font-bold text-emerald-600 flex items-center gap-2">
            <ArrowDownRight className="w-5 h-5" />
            {formatCurrency(totalDebits)}
          </p>
        </div>
        <div className="kpi-card">
          <p className="text-xs font-bold uppercase text-slate-500">Total Credits (Out)</p>
          <p className="text-2xl font-mono font-bold text-red-600 flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5" />
            {formatCurrency(totalCredits)}
          </p>
        </div>
        <div className="kpi-card bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
          <p className="text-xs font-bold uppercase text-orange-600">Closing Balance</p>
          <p className="text-2xl font-mono font-bold text-orange-700 dark:text-orange-400">
            {formatCurrency(closingBalance)}
          </p>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="kpi-card p-0 overflow-hidden">
        <table className="erp-table" data-testid="ledger-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Reference</th>
              <th>Description</th>
              <th>Source</th>
              <th className="text-right">Debit (In)</th>
              <th className="text-right">Credit (Out)</th>
              <th className="text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {/* Opening Balance Row */}
            <tr className="bg-slate-50 dark:bg-slate-800/50">
              <td className="font-medium">{formatDate(filters.start_date)}</td>
              <td>—</td>
              <td className="italic text-slate-500">Opening Balance</td>
              <td>—</td>
              <td className="text-right">—</td>
              <td className="text-right">—</td>
              <td className="text-right font-mono font-bold">{formatCurrency(openingBalance)}</td>
            </tr>
            
            {transactionsWithBalance.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-400">
                  <Icon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No transactions in this period</p>
                </td>
              </tr>
            ) : (
              transactionsWithBalance.map((txn, index) => (
                <tr key={txn.id || index}>
                  <td>{formatDate(txn.entry_date)}</td>
                  <td className="font-mono text-sm">{txn.reference_number || txn.entry_number || '—'}</td>
                  <td className="max-w-xs truncate">{txn.description || '—'}</td>
                  <td>
                    <Badge variant="outline" className="text-xs">
                      {txn.source || txn.reference_type || 'manual'}
                    </Badge>
                  </td>
                  <td className="text-right font-mono">
                    {txn.debit_amount > 0 ? (
                      <span className="text-emerald-600 font-medium">{formatCurrency(txn.debit_amount)}</span>
                    ) : '—'}
                  </td>
                  <td className="text-right font-mono">
                    {txn.credit_amount > 0 ? (
                      <span className="text-red-600 font-medium">{formatCurrency(txn.credit_amount)}</span>
                    ) : '—'}
                  </td>
                  <td className="text-right font-mono font-bold">{formatCurrency(txn.running_balance)}</td>
                </tr>
              ))
            )}
            
            {/* Totals Row */}
            <tr className="bg-slate-100 dark:bg-slate-800 font-bold">
              <td colSpan={4}>Closing Balance</td>
              <td className="text-right font-mono text-emerald-600">{formatCurrency(totalDebits)}</td>
              <td className="text-right font-mono text-red-600">{formatCurrency(totalCredits)}</td>
              <td className="text-right font-mono text-orange-600">{formatCurrency(closingBalance)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
