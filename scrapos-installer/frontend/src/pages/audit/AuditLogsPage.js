import { useState, useEffect } from 'react';
import { auditLogsAPI } from '../../lib/api';
import { formatDateTime } from '../../lib/utils';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { FileText, Loader2 } from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');

  useEffect(() => { loadData(); }, [entityFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = entityFilter ? { entity_type: entityFilter } : {};
      const res = await auditLogsAPI.list(params);
      setLogs(res.data);
    } catch (error) {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action) => {
    const colors = { CREATE: 'status-active', UPDATE: 'status-posted', DELETE: 'status-cancelled', POST: 'status-pending' };
    return colors[action] || 'status-draft';
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="audit-logs-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white">Audit Logs</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">System activity and change history</p>
        </div>
      </div>

      <div className="kpi-card">
        <div className="flex gap-4">
          <div className="w-48">
            <Select value={entityFilter || "all"} onValueChange={(v) => setEntityFilter(v === "all" ? "" : v)}>
              <SelectTrigger data-testid="audit-entity-filter"><SelectValue placeholder="All Entities" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="company">Companies</SelectItem>
                <SelectItem value="customer">Customers</SelectItem>
                <SelectItem value="supplier">Suppliers</SelectItem>
                <SelectItem value="local_purchase">Local Purchases</SelectItem>
                <SelectItem value="intl_purchase">Intl Purchases</SelectItem>
                <SelectItem value="local_sale">Local Sales</SelectItem>
                <SelectItem value="export_sale">Export Sales</SelectItem>
                <SelectItem value="weighbridge_entry">Weighbridge</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="kpi-card p-0 overflow-hidden">
        <table className="erp-table" data-testid="audit-logs-table">
          <thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Entity</th><th>Entity ID</th></tr></thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-slate-400"><FileText className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>No audit logs found</p></td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} data-testid={`audit-row-${log.id}`}>
                  <td className="text-sm">{formatDateTime(log.created_at)}</td>
                  <td className="font-medium">{log.user_email}</td>
                  <td><Badge className={getActionColor(log.action)}>{log.action}</Badge></td>
                  <td className="capitalize">{log.entity_type?.replace('_', ' ')}</td>
                  <td className="font-mono text-xs text-slate-500">{log.entity_id?.substring(0, 8)}...</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
