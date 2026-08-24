#!/usr/bin/env node

require('dotenv').config();

const mongoose = require('mongoose');
const { connectDB } = require('../config/database');
const User = require('../models/User.model');
const Conversation = require('../models/Conversation.model');
const Message = require('../models/Message.model');

const demoMarker = 'demo-chat-fixture';

async function seedDemoChats() {
  await connectDB();

  const [fan, creator] = await Promise.all([
    User.findOne({ username: 'demofan' }),
    User.findOne({ username: 'democreator' }),
  ]);
  if (!fan || !creator) {
    throw new Error('Demo users not found. Run npm run seed first.');
  }

  const participants = [fan._id, creator._id];
  let conversation = await Conversation.findOne({
    participants: { $all: participants, $size: 2 },
  });
  if (!conversation) {
    conversation = await Conversation.create({
      participants,
      unreadCounts: new Map(),
    });
  }

  const messages = [
    { senderId: fan._id, type: 'text', text: `${demoMarker}: Hi, when is your next live stream?` },
    { senderId: creator._id, type: 'text', text: `${demoMarker}: Friday at 8 PM. I will share the schedule soon.` },
    { senderId: fan._id, type: 'image', text: `${demoMarker}: Sharing a reference image.` },
    { senderId: creator._id, type: 'tip', text: `${demoMarker}: Sent a 100 coin tip.` },
  ];

  const existingCount = await Message.countDocuments({ conversationId: conversation._id, text: { $regex: `^${demoMarker}` } });
  if (existingCount === 0) {
    const inserted = await Message.insertMany(messages.map((message) => ({
      ...message,
      conversationId: conversation._id,
      isRead: message.senderId.equals(creator._id),
    })));
    const lastMessage = inserted[inserted.length - 1];
    conversation.lastMessage = {
      text: lastMessage.text,
      type: lastMessage.type,
      senderId: lastMessage.senderId,
      sentAt: lastMessage.createdAt,
    };
    conversation.unreadCounts = new Map([[fan._id.toString(), 0], [creator._id.toString(), 2]]);
    conversation.updatedAt = new Date();
    await conversation.save();
  }

  const total = await Message.countDocuments({ conversationId: conversation._id, text: { $regex: `^${demoMarker}` } });
  console.log(`Seeded ${total} demo messages in conversation ${conversation._id}.`);
  console.log(`Fan: ${fan.username} (${fan._id})`);
  console.log(`Creator: ${creator.username} (${creator._id})`);
  console.log(`Conversation ID: ${conversation._id}`);

  await mongoose.disconnect();
}

seedDemoChats().catch(async (error) => {
  console.error('Demo chat seed failed:', error.message);
  await mongoose.disconnect();
  process.exitCode = 1;
});