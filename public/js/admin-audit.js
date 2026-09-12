/**
 * QATRA — Security & Compliance Audit Trail Controller (NFR 2.5)
 * Fetches tamper-evident database audit logs for sensitive data operations.
 */
import { apiGet, showToast, formatTimeAgo } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  loadAuditLogs();
  document.getElementById('refresh-audit-btn').addEventListener('click', loadAuditLogs);
});

async function loadAuditLogs() {
  const tbody = document.getElementById('audit-table-body');
  try {
    const data = await apiGet('/auth/admin/audit-logs');
    const logs = data.items || [];

    if (logs.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 30px; color: var(--text-muted);">
            No audit records found.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = '';
    logs.forEach(log => {
      const tr = document.createElement('tr');
      const timeStr = new Date(log.created_at).toLocaleString();

      tr.innerHTML = `
        <td style="color: var(--text-muted); font-size: 12px;">${timeStr}</td>
        <td><span class="badge ${getActionBadgeClass(log.action)}">${log.action}</span></td>
        <td style="font-family: monospace; font-size: 12px;">${log.target_resource}</td>
        <td style="font-family: monospace; font-size: 12px;">#${log.target_id || '-'}</td>
        <td style="font-size: 12px;">User #${log.user_id || 'System'}</td>
        <td style="font-size: 12px; color: var(--text-muted); max-width: 250px; overflow: hidden; text-overflow: ellipsis;">
          ${log.details || '-'}
        </td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 30px; color: var(--color-danger);">
          Failed to load audit logs (Admin privileges required).
        </td>
      </tr>
    `;
  }
}

function getActionBadgeClass(action) {
  if (action.includes('REJECT') || action.includes('ERROR')) return 'badge-critical';
  if (action.includes('APPROVE') || action.includes('LOGIN')) return 'badge-success';
  if (action.includes('SUBMIT') || action.includes('UPLOAD')) return 'badge-standard';
  return 'badge-gray';
}
