#!/usr/bin/env node

require('dotenv').config();

const mongoose = require('mongoose');
const { connectDB, connectAuthDB, getAuthModels } = require('../config/database');
const User = require('../models/User.model');
const Notification = require('../models/Notification.model');

const demoPrefix = 'demo-notification-';

async function seedDemoNotifications() {
  await connectDB();
  await connectAuthDB();

  const { User: AuthUser } = getAuthModels();
  const admin = await AuthUser.findOne({ role: 'admin', isDeleted: false }).select('_id username email');
  if (!admin) throw new Error('Admin user not found. Run npm run seed first.');

  const demoUser = await User.findOne({ username: 'demofan', isDeleted: false }).select('_id username email');
  const targetUserId = demoUser?._id || admin._id;
  const fixtures = [
    {
      key: `${demoPrefix}report`,
      type: 'report',
      title: 'New report submitted',
      body: 'A post was reported for nudity and needs review.',
      data: { targetType: 'report', targetId: 'demo-report-id', action: 'review_report' },
      isRead: false,
    },
    {
      key: `${demoPrefix}payment`,
      type: 'payment',
      title: 'Payment completed',
      body: 'Coin purchase completed successfully.',
      data: { targetType: 'payment', targetId: 'demo-payment-id', action: 'view_payment' },
      isRead: false,
    },
    {
      key: `${demoPrefix}payout`,
      type: 'payout',
      title: 'New payout request',
      body: 'A creator payout request requires review.',
      data: { targetType: 'payout', targetId: 'demo-payout-id', action: 'review_payout' },
      isRead: false,
    },
    {
      key: `${demoPrefix}read`,
      type: 'system',
      title: 'Platform sync completed',
      body: 'The platform sync completed successfully.',
      data: { targetType: 'system', action: 'open_activity' },
      isRead: true,
    },
  ];

  for (const fixture of fixtures) {
    await Notification.updateOne(
      { dedupeKey: fixture.key, userId: admin._id },
      { $set: { ...fixture, dedupeKey: fixture.key, userId: admin._id } },
      { upsert: true }
    );
  }

  // Add one normal user notification to confirm it stays out of the admin inbox.
  if (demoUser) {
    await Notification.updateOne(
      { dedupeKey: `${demoPrefix}user-only`, userId: targetUserId },
      {
        $set: {
          dedupeKey: `${demoPrefix}user-only`,
          userId: targetUserId,
          type: 'system',
          title: 'User-only demo notification',
          body: 'This notification should not appear in the admin inbox.',
          isRead: false,
        },
      },
      { upsert: true }
    );
  }

  const adminCount = await Notification.countDocuments({ userId: admin._id, dedupeKey: { $regex: `^${demoPrefix}` } });
  console.log(`Seeded ${adminCount} admin demo notifications.`);
  console.log(`Admin: ${admin.username} (${admin._id})`);
  console.log(`Unread endpoint: GET /admin/notifications/unread-count`);

  await mongoose.disconnect();
}

seedDemoNotifications().catch(async (error) => {
  console.error('Demo notification seed failed:', error.message);
  await mongoose.disconnect();
  process.exitCode = 1;
});