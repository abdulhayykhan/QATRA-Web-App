/**
 * QATRA — Security & Compliance Audit Trail Controller (NFR 2.5)
 * Fetches tamper-evident database audit logs for sensitive data operations.
 */
import { apiGet, apiPost, showToast, formatTimeAgo, onReady } from './api.js';

onReady(() => {
  loadAuditLogs();
  document.getElementById('refresh-audit-btn').addEventListener('click', loadAuditLogs);
});

async function loadAuditLogs() {
  const tbody = document.getElementById('audit-table-body');
  const token = localStorage.getItem('qatra_token');
  if (!token) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
          <div style="font-size: 32px; margin-bottom: 8px;">🔒</div>
          <p style="font-weight: 700; font-size: 14px; margin-bottom: 4px; color: var(--text-main);">Administrator Access Required</p>
          <p style="font-size: 13px; margin-bottom: 14px;">Please log in with verified administrator credentials to view compliance audit records.</p>
          <button id="btn-audit-admin-login" type="button" class="btn btn-sm btn-primary" style="margin: 0 auto; display: inline-flex; width: auto;">
            Sign In as Alkhidmat Desk Lead 🛡️
          </button>
        </td>
      </tr>
    `;
    document.getElementById('btn-audit-admin-login')?.addEventListener('click', async () => {
      try {
        const res = await apiPost('/auth/firebase-login', {
          firebase_id_token: 'test_admin_lead_token'
        });
        localStorage.setItem('qatra_token', res.access_token);
        localStorage.setItem('qatra_user', JSON.stringify(res.user));
        showToast('Desk Lead session initialized.', 'success');
        loadAuditLogs();
      } catch (err) {
        showToast(err.message || 'Admin sign-in failed.', 'error');
      }
    });
    return;
  }

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
      const timeRaw = log.timestamp || log.created_at;
      const timeStr = timeRaw ? new Date(timeRaw).toLocaleString() : 'Just now';

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
