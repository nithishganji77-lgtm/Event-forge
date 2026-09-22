import { AuditLog } from '../models/AuditLog.js';
import { User } from '../models/User.js';
import { escapeRegex } from '../utils/paginate.js';

// Deliberately minimal — no search/filter/pagination. Phase 5 owns the full audit-log browser at
// GET /organizations/:orgId/audit-logs; this is a fixed-size feed for one dashboard widget, mounted
// at a /recent sub-path so the two coexist without collision or rename later.
export async function listRecentAuditLogs(organizationId, limit) {
  return AuditLog.find({ organization: organizationId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('actor', 'name email avatar')
    .lean();
}

// The full browser. Same inline filter-building style as listMembers/listEvents — no shared
// utils/queryFilters.js abstraction; each list service's filter set/search target is different
// enough that extracting now would be an "abstraction before it's earned" repeat.
export async function listAuditLogs(organizationId, { page, limit, search, action, entityType, dateFrom, dateTo }) {
  const filter = { organization: organizationId };
  if (action) filter.action = action;
  if (entityType) filter.entityType = entityType;
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = dateFrom;
    if (dateTo) filter.createdAt.$lte = dateTo;
  }

  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    const users = await User.find({ $or: [{ name: pattern }, { email: pattern }] })
      .select('_id')
      .lean();
    filter.actor = { $in: users.map((u) => u._id) };
  }

  const [data, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('actor', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return { data, total };
}
