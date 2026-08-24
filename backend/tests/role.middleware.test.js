const test = require('node:test');
const assert = require('node:assert/strict');
const { authorize } = require('../middleware/role.middleware');

test('authorize allows users marked as creators even when role is fan', () => {
  const req = { user: { role: 'fan', isCreator: true } };
  const res = {};
  let nextCalled = false;

  authorize('creator', 'admin')(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});

test('authorize still rejects users without creator access', () => {
  const req = { user: { role: 'fan', isCreator: false } };
  const res = {};
  let error;

  authorize('creator', 'admin')(req, res, (err) => {
    error = err;
  });

  assert.ok(error);
  assert.equal(error.statusCode, 403);
});
