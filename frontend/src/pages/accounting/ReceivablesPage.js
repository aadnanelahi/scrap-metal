import { useState, useEffect } from 'react';
import { accountingReportsAPI } from '../../lib/api';
import { formatCurrency, toISODateString, printDocument } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { Loader2, Receipt, Printer, AlertCircle, Clock, CheckCircle } from 'lucide-react';

export default function ReceivablesPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState(toISODateString(new Date()));

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await accountingReportsAPI.receivables({ as_of_date: asOfDate });
      setReport(res.data);
    } catch (error) {
      toast.error('Failed to load receivables report');
    } finally {
      setLoading(false);
    }
  };

  const getAgingColor = (bucket) => {
    switch (bucket) {
      case 'current': return 'bg-green-100 text-green-800';
      case '1-30': return 'bg-blue-100 text-blue-800';
      case '31-60': return 'bg-yellow-100 text-yellow-800';
      case '61-90': return 'bg-orange-100 text-orange-800';
      case '90+': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePrint = () => {
    if (!report) return;
    
    const html = `
      <div class="print-header">
        <h1>Accounts Receivable Aging Report</h1>
        <p>As of: ${asOfDate}</p>
      </div>
      
      <h3>Summary</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr style="background:#f1f5f9;">
          <td style="padding:8px;border:1px solid #e2e8f0;">Total Receivables</td>
          <td style="padding:8px;text-align:right;border:1px solid #e2e8f0;font-weight:bold;">${formatCurrency(report.summary.total_receivables)}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #e2e8f0;">Current</td>
          <td style="padding:8px;text-align:right;border:1px solid #e2e8f0;">${formatCurrency(report.summary.current)}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #e2e8f0;">1-30 Days</td>
          <td style="padding:8px;text-align:right;border:1px solid #e2e8f0;">${formatCurrency(report.summary.days_1_30)}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #e2e8f0;">31-60 Days</td>
          <td style="padding:8px;text-align:right;border:1px solid #e2e8f0;">${formatCurrency(report.summary.days_31_60)}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #e2e8f0;">61-90 Days</td>
          <td style="padding:8px;text-align:right;border:1px solid #e2e8f0;">${formatCurrency(report.summary.days_61_90)}</td>
        </tr>
        <tr style="background:#fee2e2;">
          <td style="padding:8px;border:1px solid #e2e8f0;">Over 90 Days</td>
          <td style="padding:8px;text-align:right;border:1px solid #e2e8f0;font-weight:bold;">${formatCurrency(report.summary.days_over_90)}</td>
        </tr>
      </table>
      
      <h3>Outstanding Invoices</h3>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:8px;text-align:left;border:1px solid #e2e8f0;">Invoice #</th>
            <th style="padding:8px;text-align:left;border:1px solid #e2e8f0;">Customer</th>
            <th style="padding:8px;text-align:left;border:1px solid #e2e8f0;">Date</th>
            <th style="padding:8px;text-align:right;border:1px solid #e2e8f0;">Amount</th>
            <th style="padding:8px;text-align:right;border:1px solid #e2e8f0;">Paid</th>
            <th style="padding:8px;text-align:right;border:1px solid #e2e8f0;">Balance</th>
            <th style="padding:8px;text-align:center;border:1px solid #e2e8f0;">Age</th>
          </tr>
        </thead>
        <tbody>
          ${report.receivables.map(r => `
            <tr>
              <td style="padding:8px;border:1px solid #e2e8f0;">${r.reference_number}</td>
              <td style="padding:8px;border:1px solid #e2e8f0;">${r.customer_name}</td>
              <td style="padding:8px;border:1px solid #e2e8f0;">${r.invoice_date}</td>
              <td style="padding:8px;text-align:right;border:1px solid #e2e8f0;">
                ${formatCurrency(r.invoice_amount_aed || r.invoice_amount)}
                ${r.currency && r.currency !== 'AED' ? `<br/><small style="color:#666;">(${r.currency} ${r.invoice_amount?.toLocaleString()})</small>` : ''}
              </td>
              <td style="padding:8px;text-align:right;border:1px solid #e2e8f0;">${formatCurrency(r.paid_amount_aed || r.paid_amount)}</td>
              <td style="padding:8px;text-align:right;border:1px solid #e2e8f0;font-weight:bold;">${formatCurrency(r.balance_aed || r.balance)}</td>
              <td style="padding:8px;text-align:center;border:1px solid #e2e8f0;">${r.days_outstanding} days</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    printDocument(html, 'Receivables-Report');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="receivables-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-600" />
            Accounts Receivable
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Outstanding customer invoices and aging analysis
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
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="card p-4 bg-emerald-50 dark:bg-emerald-900/20">
              <p className="text-xs text-emerald-600 dark:text-emerald-400">Total Receivables</p>
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                {formatCurrency(report.summary.total_receivables)}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-slate-500">Current</p>
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(report.summary.current)}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-slate-500">1-30 Days</p>
              <p className="text-lg font-semibold text-blue-600">
                {formatCurrency(report.summary.days_1_30)}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-slate-500">31-60 Days</p>
              <p className="text-lg font-semibold text-yellow-600">
                {formatCurrency(report.summary.days_31_60)}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-slate-500">61-90 Days</p>
              <p className="text-lg font-semibold text-orange-600">
                {formatCurrency(report.summary.days_61_90)}
              </p>
            </div>
            <div className="card p-4 bg-red-50 dark:bg-red-900/20">
              <p className="text-xs text-red-600 dark:text-red-400">Over 90 Days</p>
              <p className="text-lg font-bold text-red-700 dark:text-red-300">
                {formatCurrency(report.summary.days_over_90)}
              </p>
            </div>
          </div>

          {/* Receivables Table */}
          <div className="card">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Outstanding Invoices ({report.count})</h3>
            </div>
            <div className="overflow-x-auto">
              {report.receivables.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium">Invoice #</th>
                      <th className="text-left p-3 text-sm font-medium">Customer</th>
                      <th className="text-left p-3 text-sm font-medium">Date</th>
                      <th className="text-right p-3 text-sm font-medium">Invoice Amount</th>
                      <th className="text-right p-3 text-sm font-medium">Paid</th>
                      <th className="text-right p-3 text-sm font-medium">Balance</th>
                      <th className="text-center p-3 text-sm font-medium">Age</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.receivables.map((item, idx) => (
                      <tr key={idx} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-3">
                          <span className="font-mono text-sm">{item.reference_number}</span>
                          <span className="ml-2 text-xs text-slate-400">
                            {item.type === 'export_sale' ? '(Export)' : '(Local)'}
                          </span>
                        </td>
                        <td className="p-3">{item.customer_name}</td>
                        <td className="p-3 text-sm text-slate-600">{item.invoice_date}</td>
                        <td className="p-3 text-right font-mono">
                          {formatCurrency(item.invoice_amount_aed || item.invoice_amount)}
                          {item.currency && item.currency !== 'AED' && (
                            <span className="block text-xs text-slate-400">
                              ({item.currency} {item.invoice_amount?.toLocaleString()})
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono text-green-600">
                          {formatCurrency(item.paid_amount_aed || item.paid_amount)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold">
                          {formatCurrency(item.balance_aed || item.balance)}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAgingColor(item.aging_bucket)}`}>
                            {item.days_outstanding} days
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-slate-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                  <p>No outstanding receivables</p>
                  <p className="text-sm">All customer invoices have been paid</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
