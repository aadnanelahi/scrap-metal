import { useState, useEffect } from 'react';
import { reportsAPI } from '../../lib/api';
import { formatCurrency, toISODateString } from '../../lib/utils';
import { exportReport } from '../../lib/export';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Download, Loader2, FileText, FileSpreadsheet } from 'lucide-react';

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

  const handleExport = (format) => {
    if (!report) {
      toast.error('No report data to export');
      return;
    }

    const columns = [
      { key: 'box', header: 'Box', width: 8 },
      { key: 'description', header: 'Description', width: 40 },
      { key: 'amount', header: 'Amount (AED)', format: 'currency', align: 'right', width: 18 },
      { key: 'vat', header: 'VAT (AED)', format: 'currency', align: 'right', width: 18 }
    ];

    const data = [
      { box: '1', description: 'Standard rated supplies in UAE', amount: report.output_vat?.taxable_sales || 0, vat: report.output_vat?.vat_amount || 0 },
      { box: '6', description: 'Zero-rated exports', amount: report.zero_rated_exports || 0, vat: 0 },
      { box: '9', description: 'Total value of due tax for the period', amount: '', vat: report.output_vat?.vat_amount || 0 },
      { box: '10', description: 'Standard rated expenses in UAE', amount: report.input_vat?.taxable_purchases || 0, vat: report.input_vat?.vat_amount || 0 },
      { box: '13', description: 'Total value of recoverable tax for the period', amount: '', vat: report.input_vat?.vat_amount || 0 },
      { box: '14', description: 'Payable tax for the period', amount: '', vat: report.net_vat_payable || 0 }
    ];

    exportReport(format, 'UAE VAT Report', columns, data, {
      dateRange: `${filters.start_date} to ${filters.end_date}`,
      totals: {
        'Net VAT Payable': formatCurrency(report.net_vat_payable || 0)
      }
    });
    toast.success(`Exported to ${format.toUpperCase()}`);
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="vat-report-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white">VAT Report</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">UAE VAT summary for FTA filing</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2" data-testid="export-vat-btn">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleExport('pdf')}>
              <FileText className="w-4 h-4 mr-2" />
              Export to PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('excel')}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export to Excel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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

          <div className="kpi-card bg-slate-900 text-white">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Net VAT Payable</h3>
            <div className="space-y-2">
              <p className="text-3xl font-mono font-bold">{formatCurrency(report.net_vat_payable || 0)}</p>
              <p className="text-xs text-slate-400">
                {(report.net_vat_payable || 0) > 0 ? 'Amount payable to FTA' : 'Refund due from FTA'}
              </p>
            </div>
          </div>
        </div>
      )}

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
