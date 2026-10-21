import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, RefreshCw, Clock, User, Filter, AlertCircle } from 'lucide-react';
import type { AuditLog, User as UserType } from '../types';
import { api } from '../api';
import { formatDateTime } from '../utils';

interface AuditLogsViewProps {
  currentUser: UserType;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ currentUser }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter(
    l =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.userName.toLowerCase().includes(search.toLowerCase()) ||
      l.entity.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-slate-100 text-slate-800 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Immutable Audit Trail
            </span>
            <span className="text-xs text-slate-500">
              {currentUser.role === 'developer' ? 'Global System Logs' : 'Firm Read-Only Logs'}
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">System Security &amp; Activity Logs</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Every bank detail change, passbook verification, RTGS creation, and login attempt is cryptographically recorded.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition inline-flex items-center gap-1.5 self-start md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search audit trail by user, action, farmer ID, or bank..."
            className="block w-full pl-10 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 bg-slate-50/50"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-800 mx-auto mb-2" />
            <p className="text-xs text-slate-500">Loading audit history...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">No activity logs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Action Recorded</th>
                  <th className="px-4 py-3">Entity Affected</th>
                  <th className="px-4 py-3">Details / Value Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filtered.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{log.userName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {log.firmId === 'system' ? 'System' : `Firm: ${log.firmId}`}
                      </div>
                    </td>

                    <td className="px-4 py-3 font-semibold text-slate-800">{log.action}</td>

                    <td className="px-4 py-3 font-mono text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                        {log.entity}
                      </span>
                      <div className="text-slate-400 text-[10px] truncate max-w-xs mt-0.5">{log.entityId}</div>
                    </td>

                    <td className="px-4 py-3 text-slate-600 max-w-sm truncate text-[11px]">
                      {log.newValue ? (
                        <span className="text-emerald-900 font-medium">{log.newValue}</span>
                      ) : (
                        <span className="text-slate-400">Activity logged</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
