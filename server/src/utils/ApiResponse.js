export function sendSuccess(res, { data = null, message = 'Success', statusCode = 200 } = {}) {
  return res.status(statusCode).json({ success: true, data, message });
}

export function sendPaginated(res, { data, page, limit, total, message = 'Success' }) {
  return res.status(200).json({
    success: true,
    data,
    message,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}
