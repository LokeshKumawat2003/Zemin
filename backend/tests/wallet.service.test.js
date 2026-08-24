const test = require('node:test');
const assert = require('node:assert/strict');
const { walletService } = require('../services/wallet.service');
const Wallet = require('../models/Wallet.model');
const Creator = require('../models/Creator.model');
const Transaction = require('../models/Transaction.model');

test('resolvePurchasePackage returns a valid INR package for 100+ coins', () => {
  const pkg = walletService.resolvePurchasePackage('pkg_100');

  assert.equal(pkg.id, 'pkg_100');
  assert.equal(pkg.totalCoins, 100);
  assert.equal(pkg.priceINR, 100);
});

test('resolvePurchasePackage rejects packages below the minimum', () => {
  assert.throws(
    () => walletService.resolvePurchasePackage('pkg_50'),
    /Minimum purchase is 100 coins/
  );
});

test('withdrawEarnings transfers creator earnings to the wallet', async () => {
  const originalWalletFindOneAndUpdate = Wallet.findOneAndUpdate;
  const originalCreatorFindOne = Creator.findOne;
  const originalCreatorFindOneAndUpdate = Creator.findOneAndUpdate;
  const originalTransactionCreate = Transaction.create;

  try {
    Wallet.findOneAndUpdate = async () => ({ fiatBalance: 250000, currency: 'INR' });
    Creator.findOne = async () => ({ availableBalance: 250000, pendingBalance: 250000 });
    Creator.findOneAndUpdate = async () => ({ ok: true });
    Transaction.create = async () => ({ ok: true });

    const result = await walletService.withdrawEarnings('creator_1');

    assert.equal(result.amount, 2500);
    assert.equal(result.walletBalance, 2500);
  } finally {
    Wallet.findOneAndUpdate = originalWalletFindOneAndUpdate;
    Creator.findOne = originalCreatorFindOne;
    Creator.findOneAndUpdate = originalCreatorFindOneAndUpdate;
    Transaction.create = originalTransactionCreate;
  }
});
