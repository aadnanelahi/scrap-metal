import { useState, useEffect } from 'react';
import { reportsAPI } from '../../lib/api';
import { formatCurrency, formatDate, toISODateString } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { FileText, Download, Loader2 } from 'lucide-react';

export default function VATReportPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    start_date: toISODateString(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    end_date: toISODateString(new Date())
  });

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await reportsAPI.vatReport(filters);
      setReport(res.data);
    } catch (error) {
      toast.error('Failed to load VAT report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReport(); }, []);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="vat-report-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white">VAT Report</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">UAE VAT summary for FTA filing</p>
        </div>
      </div>

      {/* Filters */}
      <div className="kpi-card">
        <div className="flex gap-4 items-end">
          <div>
            <Label className="form-label">Start Date</Label>
            <Input type="date" value={filters.start_date} onChange={(e) => setFilters({ ...filters, start_date: e.target.value })} className="form-input w-44" data-testid="vat-start-date" />
          </div>
          <div>
            <Label className="form-label">End Date</Label>
            <Input type="date" value={filters.end_date} onChange={(e) => setFilters({ ...filters, end_date: e.target.value })} className="form-input w-44" data-testid="vat-end-date" />
          </div>
          <Button onClick={loadReport} disabled={loading} className="btn-accent" data-testid="vat-generate-btn">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate Report'}
          </Button>
        </div>
      </div>

      {report && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Output VAT */}
          <div className="kpi-card">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Output VAT (Sales)</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Taxable Sales</span>
                <span className="font-mono">{formatCurrency(report.output_vat?.taxable_sales || 0)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>VAT Amount</span>
                <span className="font-mono text-emerald-600">{formatCurrency(report.output_vat?.vat_amount || 0)}</span>
              </div>
            </div>
          </div>

          {/* Input VAT */}
          <div className="kpi-card">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Input VAT (Purchases)</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Taxable Purchases</span>
                <span className="font-mono">{formatCurrency(report.input_vat?.taxable_purchases || 0)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>VAT Amount</span>
                <span className="font-mono text-blue-600">{formatCurrency(report.input_vat?.vat_amount || 0)}</span>
              </div>
            </div>
          </div>

          {/* Zero Rated */}
          <div className="kpi-card">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Zero-Rated Exports</h3>
            <div className="space-y-2">
              <div className="flex justify-between font-bold">
                <span>Export Sales</span>
                <span className="font-mono">{formatCurrency(report.zero_rated_exports || 0)}</span>
              </div>
              <p className="text-xs text-slate-400">VAT @ 0% for exports</p>
            </div>
          </div>

          {/* Net VAT */}
          <div className="kpi-card bg-slate-900 text-white">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Net VAT Payable</h3>
            <div className="space-y-2">
              <p className="text-3xl font-mono font-bold">
                {formatCurrency(report.net_vat_payable || 0)}
              </p>
              <p className="text-xs text-slate-400">
                {(report.net_vat_payable || 0) > 0 ? 'Amount payable to FTA' : 'Refund due from FTA'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Table */}
      {report && (
        <div className="kpi-card">
          <h3 className="fieldset-legend">VAT Return Summary (Box Format)</h3>
          <table className="erp-table">
            <thead>
              <tr>
                <th>Box</th>
                <th>Description</th>
                <th className="text-right">Amount (AED)</th>
                <th className="text-right">VAT (AED)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-mono">1</td>
                <td>Standard rated supplies in UAE</td>
                <td className="text-right font-mono">{formatCurrency(report.output_vat?.taxable_sales || 0)}</td>
                <td className="text-right font-mono">{formatCurrency(report.output_vat?.vat_amount || 0)}</td>
              </tr>
              <tr>
                <td className="font-mono">6</td>
                <td>Zero-rated exports</td>
                <td className="text-right font-mono">{formatCurrency(report.zero_rated_exports || 0)}</td>
                <td className="text-right font-mono">{formatCurrency(0)}</td>
              </tr>
              <tr className="bg-slate-50 dark:bg-slate-800">
                <td className="font-mono font-bold">9</td>
                <td className="font-bold">Total value of due tax for the period</td>
                <td className="text-right font-mono"></td>
                <td className="text-right font-mono font-bold">{formatCurrency(report.output_vat?.vat_amount || 0)}</td>
              </tr>
              <tr>
                <td className="font-mono">10</td>
                <td>Standard rated expenses in UAE</td>
                <td className="text-right font-mono">{formatCurrency(report.input_vat?.taxable_purchases || 0)}</td>
                <td className="text-right font-mono">{formatCurrency(report.input_vat?.vat_amount || 0)}</td>
              </tr>
              <tr className="bg-slate-50 dark:bg-slate-800">
                <td className="font-mono font-bold">13</td>
                <td className="font-bold">Total value of recoverable tax for the period</td>
                <td className="text-right font-mono"></td>
                <td className="text-right font-mono font-bold">{formatCurrency(report.input_vat?.vat_amount || 0)}</td>
              </tr>
              <tr className="bg-orange-50 dark:bg-orange-900/20">
                <td className="font-mono font-bold">14</td>
                <td className="font-bold">Payable tax for the period</td>
                <td className="text-right font-mono"></td>
                <td className="text-right font-mono font-bold text-lg">{formatCurrency(report.net_vat_payable || 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
