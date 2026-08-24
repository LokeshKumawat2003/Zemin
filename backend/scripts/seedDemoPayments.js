#!/usr/bin/env node

require('dotenv').config();

const mongoose = require('mongoose');
const { connectDB } = require('../config/database');
const User = require('../models/User.model');
const Payout = require('../models/Payout.model');

const demoPrefix = 'demo-payout-';

async function seedDemoPayments() {
  await connectDB();

  const creator = await User.findOne({ username: 'democreator' });
  if (!creator) {
    throw new Error('Demo creator not found. Run npm run seed first.');
  }

  const fixtures = [
    {
      referenceId: `${demoPrefix}pending-bank`,
      amount: 125000,
      method: 'bank',
      status: 'pending',
      bankDetails: { accountName: 'Demo Creator', accountNumber: 'XXXXXX7890', ifscCode: 'DEMO0001234' },
    },
    {
      referenceId: `${demoPrefix}pending-upi`,
      amount: 75000,
      method: 'upi',
      status: 'pending',
      upiId: 'democreator@upi',
    },
    {
      referenceId: `${demoPrefix}approved-bank`,
      amount: 200000,
      method: 'bank',
      status: 'approved',
      bankDetails: { accountName: 'Demo Creator', accountNumber: 'XXXXXX7890', ifscCode: 'DEMO0001234' },
    },
    {
      referenceId: `${demoPrefix}rejected-upi`,
      amount: 50000,
      method: 'upi',
      status: 'rejected',
      upiId: 'old-account@upi',
      rejectionReason: 'Payment identity could not be verified',
    },
  ];

  for (const fixture of fixtures) {
    await Payout.updateOne(
      { referenceId: fixture.referenceId },
      { $set: { ...fixture, userId: creator._id, currency: 'INR' } },
      { upsert: true }
    );
  }

  console.log(`Seeded ${fixtures.length} demo payouts for admin UI testing.`);
  console.log(`Creator: ${creator.username} (${creator._id})`);
  await mongoose.disconnect();
}

seedDemoPayments().catch(async (error) => {
  console.error('Demo payment seed failed:', error.message);
  await mongoose.disconnect();
  process.exitCode = 1;
});