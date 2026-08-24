#!/usr/bin/env node

require('dotenv').config();

const mongoose = require('mongoose');
const { connectDB } = require('../config/database');
const User = require('../models/User.model');
const Creator = require('../models/Creator.model');
const Post = require('../models/Post.model');
const LiveRoom = require('../models/LiveRoom.model');
const Report = require('../models/Report.model');
const { hashPassword } = require('../utils/bcrypt.util');

const demoMarker = 'demo-report-fixture';

async function findOrCreateUser({ username, email, displayName, role, isCreator }) {
  let user = await User.findOne({ username });
  if (!user) {
    user = await User.create({
      username,
      email,
      passwordHash: await hashPassword('DemoPass123'),
      displayName,
      role,
      isCreator,
      isVerified: true,
    });
  }
  return user;
}

async function seedDemoReports() {
  await connectDB();

  const creatorUser = await findOrCreateUser({
    username: 'democreator',
    email: 'creator@Zemin.app',
    displayName: 'Demo Creator',
    role: 'creator',
    isCreator: true,
  });
  const reporterUser = await findOrCreateUser({
    username: 'demofan',
    email: 'fan@Zemin.app',
    displayName: 'Demo Fan',
    role: 'fan',
    isCreator: false,
  });

  const creator = await Creator.findOneAndUpdate(
    { userId: creatorUser._id },
    { $setOnInsert: { userId: creatorUser._id, categories: ['music', 'lifestyle'], verificationStatus: 'approved' } },
    { new: true, upsert: true }
  );

  let post = await Post.findOne({ userId: creatorUser._id, caption: { $regex: demoMarker } });
  if (!post) {
    post = await Post.create({
      userId: creatorUser._id,
      creatorId: creator._id,
      type: 'text',
      caption: `${demoMarker}: Sample post for admin moderation`,
      visibility: 'public',
    });
  }

  let liveRoom = await LiveRoom.findOne({ userId: creatorUser._id, title: { $regex: demoMarker } });
  if (!liveRoom) {
    liveRoom = await LiveRoom.create({
      hostId: creator._id,
      userId: creatorUser._id,
      title: `${demoMarker}: Sample live room`,
      category: 'music',
      status: 'live',
      visibility: 'public',
      streamKey: `${demoMarker}_${Date.now()}`,
      livekitRoom: `${demoMarker}_${Date.now()}`,
      startedAt: new Date(),
    });
  }

  const fixtures = [
    {
      targetType: 'user',
      targetId: creatorUser._id.toString(),
      reason: 'harassment',
      status: 'pending',
      description: `${demoMarker}: Creator allegedly sent abusive messages.`,
    },
    {
      targetType: 'post',
      targetId: post._id.toString(),
      reason: 'inappropriate',
      status: 'pending',
      description: `${demoMarker}: Review this post for inappropriate content.`,
    },
    {
      targetType: 'live',
      targetId: liveRoom._id.toString(),
      reason: 'spam',
      status: 'pending',
      description: `${demoMarker}: Live room appears to be repeatedly promoting unrelated links.`,
    },
    {
      targetType: 'message',
      targetId: 'demo-message-001',
      reason: 'scam',
      status: 'pending',
      description: `${demoMarker}: Message contains a suspicious payment request.`,
    },
    {
      targetType: 'post',
      targetId: post._id.toString(),
      reason: 'copyright',
      status: 'reviewed',
      description: `${demoMarker}: Copyright claim was reviewed and dismissed.`,
    },
    {
      targetType: 'post',
      targetId: post._id.toString(),
      reason: 'nudity',
      status: 'pending',
      description: `${demoMarker}: Possible nudity requires moderator review.`,
    },
    {
      targetType: 'message',
      targetId: 'demo-message-002',
      reason: 'sexual_content',
      status: 'pending',
      description: `${demoMarker}: Message contains unwanted sexual content.`,
    },
    {
      targetType: 'user',
      targetId: creatorUser._id.toString(),
      reason: 'fake_account',
      status: 'reviewed',
      description: `${demoMarker}: Account identity was reviewed.`,
    },
    {
      targetType: 'live',
      targetId: liveRoom._id.toString(),
      reason: 'hate_speech',
      status: 'resolved',
      description: `${demoMarker}: Hate speech report was resolved by moderation.`,
    },
    {
      targetType: 'user',
      targetId: creatorUser._id.toString(),
      reason: 'other',
      status: 'resolved',
      description: `${demoMarker}: Previous account review was resolved.`,
    },
  ];

  for (const fixture of fixtures) {
    await Report.updateOne(
      { reporterId: reporterUser._id, description: fixture.description },
      { $set: fixture, $setOnInsert: { reporterId: reporterUser._id } },
      { upsert: true }
    );
  }

  const total = await Report.countDocuments({ description: { $regex: `^${demoMarker}` } });
  console.log(`Seeded ${total} demo reports for admin UI testing.`);
  console.log(`Reporter user: ${reporterUser._id}`);
  console.log(`Creator target: ${creatorUser._id}`);
  console.log(`Post target: ${post._id}`);
  console.log(`Live target: ${liveRoom._id}`);

  await mongoose.disconnect();
}

seedDemoReports().catch(async (error) => {
  console.error('Demo report seed failed:', error.message);
  await mongoose.disconnect();
  process.exitCode = 1;
});