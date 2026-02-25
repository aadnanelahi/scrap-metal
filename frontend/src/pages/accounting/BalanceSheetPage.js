import { useState, useEffect } from 'react';
import { accountingReportsAPI } from '../../lib/api';
import { formatCurrency, toISODateString, printDocument } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { Loader2, Scale, Printer, Building, CreditCard, PiggyBank } from 'lucide-react';

export default function BalanceSheetPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState(toISODateString(new Date()));

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await accountingReportsAPI.balanceSheet({ as_of_date: asOfDate });
      setReport(res.data);
    } catch (error) {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const html = `
      <div class="print-header">
        <h1>Balance Sheet</h1>
        <p>As of: ${asOfDate}</p>
      </div>
      
      <h3>Assets</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:8px;text-align:left;border:1px solid #e2e8f0;">Account</th>
            <th style="padding:8px;text-align:right;border:1px solid #e2e8f0;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${report?.assets?.items?.map(item => `
            <tr>
              <td style="padding:8px;border:1px solid #e2e8f0;">${item.account_code} - ${item.account_name}</td>
              <td style="padding:8px;text-align:right;border:1px solid #e2e8f0;">${formatCurrency(item.balance)}</td>
            </tr>
          `).join('') || '<tr><td colspan="2" style="padding:8px;text-align:center;">No assets</td></tr>'}
          <tr style="font-weight:bold;background:#f1f5f9;">
            <td style="padding:8px;border:1px solid #e2e8f0;">Total Assets</td>
            <td style="padding:8px;text-align:right;border:1px solid #e2e8f0;">${formatCurrency(report?.assets?.total || 0)}</td>
          </tr>
        </tbody>
      </table>
      
      <h3>Liabilities</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:8px;text-align:left;border:1px solid #e2e8f0;">Account</th>
            <th style="padding:8px;text-align:right;border:1px solid #e2e8f0;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${report?.liabilities?.items?.map(item => `
            <tr>
              <td style="padding:8px;border:1px solid #e2e8f0;">${item.account_code} - ${item.account_name}</td>
              <td style="padding:8px;text-align:right;border:1px solid #e2e8f0;">${formatCurrency(item.balance)}</td>
            </tr>
          `).join('') || '<tr><td colspan="2" style="padding:8px;text-align:center;">No liabilities</td></tr>'}
          <tr style="font-weight:bold;background:#f1f5f9;">
            <td style="padding:8px;border:1px solid #e2e8f0;">Total Liabilities</td>
            <td style="padding:8px;text-align:right;border:1px solid #e2e8f0;">${formatCurrency(report?.liabilities?.total || 0)}</td>
          </tr>
        </tbody>
      </table>
      
      <h3>Equity</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:8px;text-align:left;border:1px solid #e2e8f0;">Account</th>
            <th style="padding:8px;text-align:right;border:1px solid #e2e8f0;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${report?.equity?.items?.map(item => `
            <tr>
              <td style="padding:8px;border:1px solid #e2e8f0;">${item.account_code} - ${item.account_name}</td>
              <td style="padding:8px;text-align:right;border:1px solid #e2e8f0;">${formatCurrency(item.balance)}</td>
            </tr>
          `).join('') || '<tr><td colspan="2" style="padding:8px;text-align:center;">No equity</td></tr>'}
          <tr style="font-weight:bold;background:#f1f5f9;">
            <td style="padding:8px;border:1px solid #e2e8f0;">Total Equity</td>
            <td style="padding:8px;text-align:right;border:1px solid #e2e8f0;">${formatCurrency(report?.equity?.total || 0)}</td>
          </tr>
        </tbody>
      </table>
      
      <div style="background:#dbeafe;padding:16px;border-radius:4px;font-size:16px;">
        <table style="width:100%;">
          <tr>
            <td><strong>Total Liabilities + Equity</strong></td>
            <td style="text-align:right;"><strong>${formatCurrency((report?.liabilities?.total || 0) + (report?.equity?.total || 0))}</strong></td>
          </tr>
        </table>
      </div>
    `;
    printDocument(html, 'Balance-Sheet');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="balance-sheet-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Scale className="w-6 h-6 text-blue-600" />
            Balance Sheet
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Financial position as of selected date
          </p>
        </div>
        <Button onClick={handlePrint} variant="outline">
          <Printer className="w-4 h-4 mr-2" />
          Print Report
        </Button>
      </div>

      {/* Date Filter */}
      <div className="card p-4">
        <div className="flex items-end gap-4">
          <div>
            <Label>As of Date</Label>
            <Input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
            />
          </div>
          <Button onClick={loadReport}>
            Generate Report
          </Button>
        </div>
      </div>

      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assets Section */}
          <div className="card">
            <div className="p-4 border-b bg-blue-50 dark:bg-blue-900/20">
              <h3 className="font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2">
                <Building className="w-5 h-5" />
                Assets
              </h3>
            </div>
            <div className="p-4">
              {report.assets?.items?.length > 0 ? (
                <div className="space-y-2">
                  {report.assets.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm p-2 bg-slate-50 dark:bg-slate-800 rounded">
                      <span>{item.account_code} - {item.account_name}</span>
                      <span className="font-mono">{formatCurrency(item.balance)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-4">No assets recorded</p>
              )}
              <div className="mt-4 pt-4 border-t flex justify-between font-bold">
                <span>Total Assets</span>
                <span className="text-blue-600">{formatCurrency(report.assets?.total || 0)}</span>
              </div>
            </div>
          </div>

          {/* Liabilities Section */}
          <div className="card">
            <div className="p-4 border-b bg-red-50 dark:bg-red-900/20">
              <h3 className="font-semibold text-red-800 dark:text-red-200 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Liabilities
              </h3>
            </div>
            <div className="p-4">
              {report.liabilities?.items?.length > 0 ? (
                <div className="space-y-2">
                  {report.liabilities.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm p-2 bg-slate-50 dark:bg-slate-800 rounded">
                      <span>{item.account_code} - {item.account_name}</span>
                      <span className="font-mono">{formatCurrency(item.balance)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-4">No liabilities recorded</p>
              )}
              <div className="mt-4 pt-4 border-t flex justify-between font-bold">
                <span>Total Liabilities</span>
                <span className="text-red-600">{formatCurrency(report.liabilities?.total || 0)}</span>
              </div>
            </div>
          </div>

          {/* Equity Section */}
          <div className="card lg:col-span-2">
            <div className="p-4 border-b bg-purple-50 dark:bg-purple-900/20">
              <h3 className="font-semibold text-purple-800 dark:text-purple-200 flex items-center gap-2">
                <PiggyBank className="w-5 h-5" />
                Equity
              </h3>
            </div>
            <div className="p-4">
              {report.equity?.items?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {report.equity.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm p-2 bg-slate-50 dark:bg-slate-800 rounded">
                      <span>{item.account_code} - {item.account_name}</span>
                      <span className="font-mono">{formatCurrency(item.balance)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-4">No equity recorded</p>
              )}
              <div className="mt-4 pt-4 border-t flex justify-between font-bold">
                <span>Total Equity</span>
                <span className="text-purple-600">{formatCurrency(report.equity?.total || 0)}</span>
              </div>
            </div>
          </div>

          {/* Balance Summary */}
          <div className="card p-6 lg:col-span-2 bg-slate-100 dark:bg-slate-800">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex justify-between items-center p-4 bg-white dark:bg-slate-700 rounded-lg">
                <span className="text-lg font-semibold">Total Assets</span>
                <span className="text-2xl font-bold text-blue-600">{formatCurrency(report.assets?.total || 0)}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-white dark:bg-slate-700 rounded-lg">
                <span className="text-lg font-semibold">Liabilities + Equity</span>
                <span className="text-2xl font-bold text-emerald-600">
                  {formatCurrency((report.liabilities?.total || 0) + (report.equity?.total || 0))}
                </span>
              </div>
            </div>
            
            {/* Balance Check */}
            {report.assets?.total !== ((report.liabilities?.total || 0) + (report.equity?.total || 0)) && (
              <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-center">
                <span className="text-yellow-800 dark:text-yellow-200">
                  Warning: Balance sheet does not balance. Difference: {formatCurrency(Math.abs(report.assets?.total - ((report.liabilities?.total || 0) + (report.equity?.total || 0))))}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
