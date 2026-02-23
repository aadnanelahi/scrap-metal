import { useState, useEffect } from 'react';
import { reportsAPI } from '../../lib/api';
import { formatCurrency, formatDate, toISODateString } from '../../lib/utils';
import { exportToPDF, exportToExcel } from '../../lib/export';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { FileText, Loader2, Download, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

export default function TrialBalancePage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState(toISODateString(new Date()));

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await reportsAPI.trialBalance({ as_of_date: asOfDate });
      setReport(res.data);
    } catch (error) {
      toast.error('Failed to load trial balance');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (!report) return;
    
    const headers = ['Account Code', 'Account Name', 'Type', 'Debit (AED)', 'Credit (AED)'];
    const rows = report.accounts
      .filter(a => a.debit > 0 || a.credit > 0)
      .map(a => [
        a.account_code,
        a.account_name,
        a.account_type,
        a.debit > 0 ? formatCurrency(a.debit, 'AED') : '-',
        a.credit > 0 ? formatCurrency(a.credit, 'AED') : '-'
      ]);
    
    // Add totals row
    rows.push(['', 'TOTAL', '', formatCurrency(report.total_debit, 'AED'), formatCurrency(report.total_credit, 'AED')]);
    
    exportToPDF({
      title: 'Trial Balance',
      subtitle: `As of ${formatDate(report.as_of_date)}`,
      headers,
      rows,
      filename: `trial_balance_${report.as_of_date}`
    });
    toast.success('PDF exported');
  };

  const handleExportExcel = () => {
    if (!report) return;
    
    const data = report.accounts
      .filter(a => a.debit > 0 || a.credit > 0)
      .map(a => ({
        'Account Code': a.account_code,
        'Account Name': a.account_name,
        'Type': a.account_type,
        'Debit': a.debit,
        'Credit': a.credit
      }));
    
    // Add totals row
    data.push({
      'Account Code': '',
      'Account Name': 'TOTAL',
      'Type': '',
      'Debit': report.total_debit,
      'Credit': report.total_credit
    });
    
    exportToExcel(data, `trial_balance_${report.as_of_date}`);
    toast.success('Excel exported');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const accountsWithBalance = report?.accounts?.filter(a => a.debit > 0 || a.credit > 0) || [];

  return (
    <div className="space-y-6 animate-fade-in" data-testid="trial-balance-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white">
            Trial Balance
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Summary of all account balances
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">As of Date:</Label>
            <Input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="w-40"
            />
            <Button onClick={loadReport} variant="outline" size="icon">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          <Button onClick={handleExportPDF} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            PDF
          </Button>
          <Button onClick={handleExportExcel} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Excel
          </Button>
        </div>
      </div>

      {/* Balance Status Card */}
      <div className={`kpi-card ${report?.is_balanced ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {report?.is_balanced ? (
              <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            )}
            <div>
              <h3 className={`font-semibold ${report?.is_balanced ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300'}`}>
                {report?.is_balanced ? 'Trial Balance is Balanced' : 'Trial Balance is NOT Balanced'}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                As of {formatDate(report?.as_of_date)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="grid grid-cols-3 gap-8">
              <div>
                <p className="text-xs text-slate-500 uppercase">Total Debit</p>
                <p className="text-lg font-mono font-bold text-slate-900 dark:text-white">
                  {formatCurrency(report?.total_debit || 0, 'AED')}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Total Credit</p>
                <p className="text-lg font-mono font-bold text-slate-900 dark:text-white">
                  {formatCurrency(report?.total_credit || 0, 'AED')}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Difference</p>
                <p className={`text-lg font-mono font-bold ${report?.difference === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(report?.difference || 0, 'AED')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trial Balance Table */}
      <div className="kpi-card p-0 overflow-hidden">
        <table className="erp-table" data-testid="trial-balance-table">
          <thead>
            <tr>
              <th>Account Code</th>
              <th>Account Name</th>
              <th>Type</th>
              <th className="text-right">Debit (AED)</th>
              <th className="text-right">Credit (AED)</th>
            </tr>
          </thead>
          <tbody>
            {accountsWithBalance.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-slate-400">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No account balances found</p>
                  <p className="text-sm">Post some transactions to see balances here</p>
                </td>
              </tr>
            ) : (
              <>
                {accountsWithBalance.map((account) => (
                  <tr key={account.account_code} data-testid={`tb-row-${account.account_code}`}>
                    <td className="font-mono font-medium">{account.account_code}</td>
                    <td>{account.account_name}</td>
                    <td>
                      <Badge variant="outline" className="capitalize">
                        {account.account_type}
                      </Badge>
                    </td>
                    <td className="text-right font-mono">
                      {account.debit > 0 ? formatCurrency(account.debit, 'AED') : '-'}
                    </td>
                    <td className="text-right font-mono">
                      {account.credit > 0 ? formatCurrency(account.credit, 'AED') : '-'}
                    </td>
                  </tr>
                ))}
                {/* Totals Row */}
                <tr className="bg-slate-100 dark:bg-slate-800 font-bold">
                  <td colSpan={3} className="text-right">TOTAL</td>
                  <td className="text-right font-mono">{formatCurrency(report?.total_debit || 0, 'AED')}</td>
                  <td className="text-right font-mono">{formatCurrency(report?.total_credit || 0, 'AED')}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
