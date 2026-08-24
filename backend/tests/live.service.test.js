const test = require('node:test');
const assert = require('node:assert/strict');
const liveService = require('../services/live.service');

test('calculateCreatorEarnings combines entry fees, gifts, and time based rewards', () => {
  const summary = liveService.calculateCreatorEarnings({
    entryFeeCoins: 100,
    giftCoins: 300,
    durationSeconds: 1800,
  });

  assert.equal(summary.entryFeeCents, 64);
  assert.equal(summary.giftCents, 192);
  assert.equal(summary.timeBonusCents, 38);
  assert.equal(summary.totalCents, 294);
});
