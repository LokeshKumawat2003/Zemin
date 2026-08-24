require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');
const { mongodbUri } = require('../config/env');
const { connectDB, connectAuthDB, getAuthModels } = require('../config/database');
const User = require('../models/User.model');
const Wallet = require('../models/Wallet.model');
const Creator = require('../models/Creator.model');
const Post = require('../models/Post.model');
const Gift = require('../models/Gift.model');
const SubscriptionTier = require('../models/SubscriptionTier.model');
const Notification = require('../models/Notification.model');
const LiveRoom = require('../models/LiveRoom.model');
const { hashPassword } = require('../utils/bcrypt.util');
const { DEFAULT_GIFTS } = require('../config/defaultGifts');

async function seed() {
  // Connect to both databases
  await connectDB();
  await connectAuthDB();
  const { User: AuthUser } = getAuthModels();

  console.log('Seeding database...\n');

  // ==== Seed Auth Database (Demo Admin) ====
  console.log('🔐 Seeding demo admin account...');
  let demoAdmin = await AuthUser.findOne({ email: 'demo-zemin@gmail.com' });
  if (!demoAdmin) {
    demoAdmin = await AuthUser.create({
      username: 'demo-admin',
      email: 'demo-zemin@gmail.com',
      passwordHash: await hashPassword('demo123'),
      displayName: 'Demo Admin',
      role: 'admin',
      isCreator: false,
      isVerified: true,
    });
    console.log('✅ Demo admin created');
    console.log(`   Email: demo-zemin@gmail.com`);
    console.log(`   Password: demo123\n`);
  } else {
    console.log('✅ Demo admin already exists\n');
  }

  // ==== Seed Main Database ====
  console.log('📦 Seeding main database...');

  await Gift.deleteMany({});
  await Gift.insertMany(DEFAULT_GIFTS);

  let creator = await User.findOne({ username: 'democreator' });
  if (!creator) {
    creator = await User.create({
      username: 'democreator',
      email: 'creator@Zemin.app',
      passwordHash: await hashPassword('DemoPass123'),
      displayName: 'Demo Creator',
      bio: 'Welcome to my Zemin profile! Live every Friday.',
      role: 'creator',
      isCreator: true,
      isVerified: true,
    });
    await Wallet.create({ userId: creator._id, coinBalance: 5000 });
    await Creator.create({
      userId: creator._id,
      categories: ['music', 'lifestyle'],
      verificationStatus: 'approved',
      stats: { followersCount: 1250, postsCount: 0 },
    });
  }

  let fan = await User.findOne({ username: 'demofan' });
  if (!fan) {
    fan = await User.create({
      username: 'demofan',
      email: 'fan@Zemin.app',
      passwordHash: await hashPassword('DemoPass123'),
      displayName: 'Demo Fan',
      role: 'fan',
      isVerified: true,
    });
    await Wallet.create({ userId: fan._id, coinBalance: 10000, fiatBalance: 5000 });
  }

  const creatorDoc = await Creator.findOne({ userId: creator._id });
  const tierCount = await SubscriptionTier.countDocuments({ creatorId: creatorDoc._id });
  if (tierCount === 0) {
    await SubscriptionTier.insertMany([
      {
        creatorId: creatorDoc._id,
        userId: creator._id,
        name: 'Supporter',
        price: 499,
        description: 'Access to exclusive posts',
        benefits: ['Exclusive posts', 'Supporter badge'],
        badge: 'supporter',
        sortOrder: 1,
      },
      {
        creatorId: creatorDoc._id,
        userId: creator._id,
        name: 'Premium',
        price: 999,
        description: 'All content + DMs',
        benefits: ['All posts', 'DM access', 'Early live access'],
        badge: 'premium',
        sortOrder: 2,
      },
      {
        creatorId: creatorDoc._id,
        userId: creator._id,
        name: 'VIP',
        price: 2499,
        description: 'Ultimate fan experience',
        benefits: ['Everything', 'VIP badge', 'Priority replies'],
        badge: 'vip',
        sortOrder: 3,
      },
    ]);
  }

  if (fan) {
    const notifCount = await Notification.countDocuments({ userId: fan._id });
    if (notifCount === 0) {
      await Notification.insertMany([
        {
          userId: fan._id,
          type: 'system',
          title: 'Welcome to Zemin!',
          body: 'Discover creators and go live with your favorites.',
          isRead: false,
        },
        {
          userId: fan._id,
          type: 'live',
          title: '@democreator is live!',
          body: 'Friday Night Live — tap to join',
          data: { targetType: 'live', action: 'join' },
          isRead: false,
        },
      ]);
    }
  }

  const postCount = await Post.countDocuments({ userId: creator._id });
  if (postCount === 0) {
    await Post.insertMany([
      {
        userId: creator._id,
        creatorId: (await Creator.findOne({ userId: creator._id }))._id,
        type: 'text',
        caption: 'Welcome to Zemin! 🎉 #Zemin #creator',
        visibility: 'public',
        hashtags: ['Zemin', 'creator'],
        stats: { likesCount: 42, commentsCount: 5, viewsCount: 500 },
      },
      {
        userId: creator._id,
        creatorId: (await Creator.findOne({ userId: creator._id }))._id,
        type: 'photo',
        media: [{ url: 'https://picsum.photos/800/1000', type: 'image', width: 800, height: 1000 }],
        caption: 'Exclusive content coming soon ✨',
        visibility: 'public',
        stats: { likesCount: 128, commentsCount: 12, viewsCount: 1200 },
      },
      {
        userId: creator._id,
        creatorId: (await Creator.findOne({ userId: creator._id }))._id,
        type: 'photo',
        media: [{ url: 'https://picsum.photos/801/1000', type: 'image', width: 800, height: 1000 }],
        caption: 'Exclusive PPV content — unlock to view 🔒',
        visibility: 'ppv',
        isPPV: true,
        ppvPrice: 200,
        stats: { likesCount: 64, commentsCount: 8, viewsCount: 300 },
      },
    ]);
    const c = await Creator.findOne({ userId: creator._id });
    c.stats.postsCount = 3;
    await c.save();
  }

  const creatorDocFinal = await Creator.findOne({ userId: creator._id });
  const liveCount = await LiveRoom.countDocuments({ userId: creator._id, status: 'live' });
  if (liveCount === 0) {
    await LiveRoom.create({
      hostId: creatorDocFinal._id,
      userId: creator._id,
      title: 'Friday Night Live!',
      category: 'music',
      status: 'live',
      visibility: 'public',
      streamKey: `sk_live_seed_${Date.now()}`,
      livekitRoom: `room_seed_${Date.now()}`,
      startedAt: new Date(),
      stats: { currentViewers: 42, peakViewers: 42, totalViewers: 120 },
    });
    creatorDocFinal.isLive = true;
    await creatorDocFinal.save();
  }

  console.log('\n✅ Seed complete!');
  console.log('\n📋 Demo Credentials:');
  console.log('Admin:');
  console.log('  Email: demo-zemin@gmail.com');
  console.log('  Password: demo123');
  console.log('Creator:');
  console.log('  Username: democreator / DemoPass123');
  console.log('Fan:');
  console.log('  Username: demofan / DemoPass123\n');

  // Disconnect from all databases
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding error:', err);
  process.exit(1);
});
