const success = (res, data = null, message = 'Success', statusCode = 200, meta = null) => {
  const body = { success: true, data, message };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
};

const paginated = (res, data, page, limit, total, message = 'Success') =>
  success(res, data, message, 200, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 0,
  });

module.exports = { success, paginated };
