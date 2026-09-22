import { ACTION_LABELS } from '../../../utils/auditActionLabels.js';

export function AuditLogTable({ logs }) {
  return (
    <div className="border border-(--color-border) overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-meta text-(--color-text)/50 border-b border-(--color-border)">
            <th className="text-left px-4 py-3 font-medium">Actor</th>
            <th className="text-left px-4 py-3 font-medium">Action</th>
            <th className="hidden sm:table-cell text-left px-4 py-3 font-medium">Entity</th>
            <th className="text-left px-4 py-3 font-medium">When</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log._id} className="border-b border-(--color-border) last:border-0">
              <td className="px-4 py-3">
                <div>{log.actor?.name || 'Someone'}</div>
                <div className="text-meta text-(--color-text)/40">{log.actor?.email}</div>
              </td>
              <td className="px-4 py-3 text-(--color-text)/70">
                {ACTION_LABELS[log.action] || log.action.toLowerCase()}
              </td>
              <td className="hidden sm:table-cell px-4 py-3 text-(--color-text)/70">{log.entityType}</td>
              <td className="px-4 py-3 text-(--color-text)/70">
                {new Date(log.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
