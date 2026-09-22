import { listRecentAuditLogs, listAuditLogs } from '../services/auditLog.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess, sendPaginated } from '../utils/ApiResponse.js';

export const listRecentAuditLogsHandler = asyncHandler(async (req, res) => {
  const logs = await listRecentAuditLogs(req.organization._id, req.query.limit);
  return sendSuccess(res, { data: { logs } });
});

export const listAuditLogsHandler = asyncHandler(async (req, res) => {
  const { page, limit, ...filters } = req.query;
  const { data, total } = await listAuditLogs(req.organization._id, { page, limit, ...filters });
  return sendPaginated(res, { data, page, limit, total });
});
