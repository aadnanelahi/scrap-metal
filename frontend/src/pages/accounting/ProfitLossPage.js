import { useState, useEffect } from 'react';
import { accountingReportsAPI } from '../../lib/api';
import { formatCurrency, toISODateString, printDocument } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { Loader2, TrendingUp, TrendingDown, Printer, FileDown } from 'lucide-react';

export default function ProfitLossPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(new Date().getFullYear() + '-01-01');
  const [endDate, setEndDate] = useState(toISODateString(new Date()));

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await accountingReportsAPI.profitLoss({ start_date: startDate, end_date: endDate });
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
        <h1>Profit & Loss Statement</h1>
        <p>Period: ${startDate} to ${endDate}</p>
      </div>
      
      <h3>Income</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:8px;text-align:left;border:1px solid #e2e8f0;">Account</th>
            <th style="padding:8px;text-align:right;border:1px solid #e2e8f0;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${report?.income?.items?.map(item => `
            <tr>
              <td style="padding:8px;border:1px solid #e2e8f0;">${item.account_code} - ${item.account_name}</td>
              <td style="padding:8px;text-align:right;border:1px solid #e2e8f0;">${formatCurrency(item.amount)}</td>
            </tr>
          `).join('') || '<tr><td colspan="2" style="padding:8px;text-align:center;">No income</td></tr>'}
          <tr style="font-weight:bold;background:#f1f5f9;">
            <td style="padding:8px;border:1px solid #e2e8f0;">Total Income</td>
            <td style="padding:8px;text-align:right;border:1px solid #e2e8f0;">${formatCurrency(report?.income?.total || 0)}</td>
          </tr>
        </tbody>
      </table>
      
      <h3>Cost of Goods Sold</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:8px;text-align:left;border:1px solid #e2e8f0;">Account</th>
            <th style="padding:8px;text-align:right;border:1px solid #e2e8f0;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${report?.cost_of_goods_sold?.items?.map(item => `
            <tr>
              <td style="padding:8px;border:1px solid #e2e8f0;">${item.account_code} - ${item.account_name}</td>
              <td style="padding:8px;text-align:right;border:1px solid #e2e8f0;">${formatCurrency(item.amount)}</td>
            </tr>
          `).join('') || '<tr><td colspan="2" style="padding:8px;text-align:center;">No COGS</td></tr>'}
          <tr style="font-weight:bold;background:#f1f5f9;">
            <td style="padding:8px;border:1px solid #e2e8f0;">Total COGS</td>
            <td style="padding:8px;text-align:right;border:1px solid #e2e8f0;">${formatCurrency(report?.cost_of_goods_sold?.total || 0)}</td>
          </tr>
        </tbody>
      </table>
      
      <div style="background:#dbeafe;padding:12px;border-radius:4px;margin-bottom:20px;">
        <strong>Gross Profit: ${formatCurrency(report?.gross_profit || 0)}</strong>
      </div>
      
      <h3>Operating Expenses</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:8px;text-align:left;border:1px solid #e2e8f0;">Account</th>
            <th style="padding:8px;text-align:right;border:1px solid #e2e8f0;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${report?.operating_expenses?.items?.map(item => `
            <tr>
              <td style="padding:8px;border:1px solid #e2e8f0;">${item.account_code} - ${item.account_name}</td>
              <td style="padding:8px;text-align:right;border:1px solid #e2e8f0;">${formatCurrency(item.amount)}</td>
            </tr>
          `).join('') || '<tr><td colspan="2" style="padding:8px;text-align:center;">No expenses</td></tr>'}
          <tr style="font-weight:bold;background:#f1f5f9;">
            <td style="padding:8px;border:1px solid #e2e8f0;">Total Expenses</td>
            <td style="padding:8px;text-align:right;border:1px solid #e2e8f0;">${formatCurrency(report?.operating_expenses?.total || 0)}</td>
          </tr>
        </tbody>
      </table>
      
      <div style="background:${report?.net_profit >= 0 ? '#dcfce7' : '#fee2e2'};padding:16px;border-radius:4px;font-size:18px;">
        <strong>Net ${report?.net_profit >= 0 ? 'Profit' : 'Loss'}: ${formatCurrency(Math.abs(report?.net_profit || 0))}</strong>
      </div>
    `;
    printDocument(html, 'Profit-Loss-Report');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="profit-loss-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
            Profit & Loss Statement
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Income statement for the selected period
          </p>
        </div>
        <Button onClick={handlePrint} variant="outline">
          <Printer className="w-4 h-4 mr-2" />
          Print Report
        </Button>
      </div>

      {/* Date Filters */}
      <div className="card p-4">
        <div className="flex items-end gap-4">
          <div>
            <Label>Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label>End Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <Button onClick={loadReport}>
            Generate Report
          </Button>
        </div>
      </div>

      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income Section */}
          <div className="card">
            <div className="p-4 border-b bg-emerald-50 dark:bg-emerald-900/20">
              <h3 className="font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Income
              </h3>
            </div>
            <div className="p-4">
              {report.income?.items?.length > 0 ? (
                <div className="space-y-2">
                  {report.income.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.account_code} - {item.account_name}</span>
                      <span className="font-mono">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-4">No income recorded</p>
              )}
              <div className="mt-4 pt-4 border-t flex justify-between font-bold">
                <span>Total Income</span>
                <span className="text-emerald-600">{formatCurrency(report.income?.total || 0)}</span>
              </div>
            </div>
          </div>

          {/* COGS Section */}
          <div className="card">
            <div className="p-4 border-b bg-orange-50 dark:bg-orange-900/20">
              <h3 className="font-semibold text-orange-800 dark:text-orange-200">
                Cost of Goods Sold
              </h3>
            </div>
            <div className="p-4">
              {report.cost_of_goods_sold?.items?.length > 0 ? (
                <div className="space-y-2">
                  {report.cost_of_goods_sold.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.account_code} - {item.account_name}</span>
                      <span className="font-mono">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-4">No COGS recorded</p>
              )}
              <div className="mt-4 pt-4 border-t flex justify-between font-bold">
                <span>Total COGS</span>
                <span className="text-orange-600">{formatCurrency(report.cost_of_goods_sold?.total || 0)}</span>
              </div>
            </div>
          </div>

          {/* Gross Profit */}
          <div className="card p-4 bg-blue-50 dark:bg-blue-900/20 lg:col-span-2">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-blue-800 dark:text-blue-200">Gross Profit</span>
              <span className="text-2xl font-bold text-blue-600">{formatCurrency(report.gross_profit || 0)}</span>
            </div>
          </div>

          {/* Expenses Section */}
          <div className="card lg:col-span-2">
            <div className="p-4 border-b bg-red-50 dark:bg-red-900/20">
              <h3 className="font-semibold text-red-800 dark:text-red-200 flex items-center gap-2">
                <TrendingDown className="w-5 h-5" />
                Operating Expenses
              </h3>
            </div>
            <div className="p-4">
              {report.operating_expenses?.items?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {report.operating_expenses.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm p-2 bg-slate-50 dark:bg-slate-800 rounded">
                      <span>{item.account_code} - {item.account_name}</span>
                      <span className="font-mono text-red-600">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-4">No expenses recorded</p>
              )}
              <div className="mt-4 pt-4 border-t flex justify-between font-bold">
                <span>Total Operating Expenses</span>
                <span className="text-red-600">{formatCurrency(report.operating_expenses?.total || 0)}</span>
              </div>
            </div>
          </div>

          {/* Net Profit/Loss */}
          <div className={`card p-6 lg:col-span-2 ${report.net_profit >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
            <div className="flex justify-between items-center">
              <span className="text-xl font-semibold">
                Net {report.net_profit >= 0 ? 'Profit' : 'Loss'}
              </span>
              <span className={`text-3xl font-bold ${report.net_profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatCurrency(Math.abs(report.net_profit || 0))}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
