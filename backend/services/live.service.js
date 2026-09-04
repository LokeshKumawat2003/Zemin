const crypto = require('crypto');
const LiveRoom = require('../models/LiveRoom.model');
const Creator = require('../models/Creator.model');
const User = require('../models/User.model');
const Wallet = require('../models/Wallet.model');
const Gift = require('../models/Gift.model');
const Follower = require('../models/Follower.model');
const Subscription = require('../models/Subscription.model');
const AppError = require('../utils/AppError');
const livekitService = require('./livekit.service');
const notificationService = require('./notification.service');
const { giftService } = require('./wallet.service');

class LiveService {
  calculateCreatorEarnings({ entryFeeCoins = 0, giftCoins = 0, durationSeconds = 0 }) {
    const entryFeeCents = Math.floor(entryFeeCoins * 100 * 0.64);
    const giftCents = Math.floor(giftCoins * 100 * 0.64);
    const timeBonusCents = Math.floor(Math.max(0, durationSeconds - 600) * 0.032);
    const totalCents = entryFeeCents + giftCents + timeBonusCents;

    return {
      entryFeeCents,
      giftCents,
      timeBonusCents,
      totalCents,
    };
  }

  async ensureCreatorAccount(userId) {
    let creator = await Creator.findOne({ userId });
    if (!creator) {
      creator = await Creator.create({
        userId,
        verificationStatus: 'approved',
      });
      await User.findByIdAndUpdate(userId, { isCreator: true, role: 'creator' });
    }
    return creator;
  }

  mapRoomHost(room) {
    const host = room.userId;
    if (!host || typeof host === 'string') return null;
    return {
      id: host._id.toString(),
      username: host.username,
      displayName: host.displayName,
      avatar: host.avatar,
      isVerified: host.isVerified,
    };
  }

  mapRoomSummary(r, giftMap = {}) {
    const entryGift = r.entryGiftId ? giftMap[r.entryGiftId] : null;
    return {
      id: r._id.toString(),
      title: r.title,
      category: r.category,
      thumbnail: r.thumbnail || r.userId?.avatar,
      roomType: r.roomType || 'public',
      entryFeeCoins: r.entryFeeCoins || 0,
      entryGiftId: r.entryGiftId,
      entryGift: entryGift
        ? {
            giftId: entryGift.giftId,
            name: entryGift.name,
            emoji: entryGift.emoji,
            coinCost: entryGift.coinCost,
          }
        : null,
      scheduledAt: r.scheduledAt,
      status: r.status,
      viewerCount: r.stats.currentViewers,
      host: this.mapRoomHost(r),
      startedAt: r.startedAt,
    };
  }

  async loadGiftMap(giftIds = []) {
    const uniqueIds = [...new Set(giftIds.filter(Boolean))];
    if (!uniqueIds.length) return {};
    await giftService.ensureDefaultGifts();
    const gifts = await Gift.find({ giftId: { $in: uniqueIds }, isActive: true });
    return gifts.reduce((acc, gift) => {
      acc[gift.giftId] = gift;
      return acc;
    }, {});
  }

  async resolveEntryGift(entryGiftId, entryFeeCoins = 0) {
    if (entryGiftId) {
      await giftService.ensureDefaultGifts();
      const gift = await Gift.findOne({ giftId: entryGiftId, isActive: true });
      if (!gift) throw new AppError('GIFT_NOT_FOUND', 404, 'Entry gift not found');
      return { gift, entryFeeCoins: gift.coinCost };
    }
    if (entryFeeCoins > 0) {
      return { gift: null, entryFeeCoins };
    }
    return { gift: null, entryFeeCoins: 0 };
  }

  async createRoom(userId, data) {
    const creator = await this.ensureCreatorAccount(userId);

    const roomType = data.roomType === 'vip' ? 'vip' : 'public';
    const startMode = data.startMode === 'scheduled' ? 'scheduled' : 'instant';
    const { gift: entryGift, entryFeeCoins } = await this.resolveEntryGift(
      data.entryGiftId,
      Number(data.entryFeeCoins || 0)
    );

    if (roomType === 'vip' && entryFeeCoins <= 0) {
      throw new AppError('VALIDATION_ERROR', 400, 'VIP rooms require a gift entry fee');
    }

    let scheduledAt;
    if (startMode === 'scheduled') {
      scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;
      if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
        throw new AppError('VALIDATION_ERROR', 400, 'Valid scheduled time is required');
      }
      if (scheduledAt.getTime() <= Date.now()) {
        throw new AppError('VALIDATION_ERROR', 400, 'Scheduled time must be in the future');
      }
    }

    const streamKey = `sk_live_${crypto.randomBytes(12).toString('hex')}`;
    const livekitRoom = `room_${crypto.randomBytes(8).toString('hex')}`;

    const room = await LiveRoom.create({
      hostId: creator._id,
      userId,
      title: data.title,
      category: data.category || (roomType === 'vip' ? 'vip' : 'general'),
      thumbnail: data.thumbnail,
      visibility: data.visibility || 'public',
      roomType,
      entryFeeCoins,
      entryGiftId: entryGift?.giftId,
      scheduledAt: startMode === 'scheduled' ? scheduledAt : undefined,
      maxViewers: roomType === 'vip' ? 1 : data.maxViewers ?? null,
      streamKey,
      livekitRoom,
      enableRecording: data.enableRecording ?? false,
      enableGuest: roomType === 'vip' ? false : data.enableGuest ?? true,
      maxGuests: roomType === 'vip' ? 0 : Math.min(Number(data.maxGuests ?? 1000000), 1000000),
      status: 'waiting',
    });

    const webrtcToken =
      (await livekitService.generateToken(room.livekitRoom, userId, 'host')) ||
      `dev_token_${room._id}`;

    const response = {
      roomId: room._id.toString(),
      streamKey: room.streamKey,
      rtmpUrl: 'rtmp://live.Zemin.app/live',
      webrtcToken,
      livekitUrl: livekitService.getPublicUrl(),
      livekitRoom: room.livekitRoom,
      livekitEnabled: livekitService.isReady(),
      status: room.status,
      roomType: room.roomType,
      entryFeeCoins: room.entryFeeCoins,
      entryGiftId: room.entryGiftId,
      maxGuests: room.maxGuests,
      entryGift: entryGift
        ? {
            giftId: entryGift.giftId,
            name: entryGift.name,
            emoji: entryGift.emoji,
            coinCost: entryGift.coinCost,
          }
        : null,
      scheduledAt: room.scheduledAt,
      startMode,
    };

    console.log('[LiveService] createRoom response:', {
      roomType: response.roomType,
      livekitRoom: response.livekitRoom,
      livekitUrl: response.livekitUrl,
      tokenLength: response.webrtcToken?.length,
      livekitEnabled: response.livekitEnabled,
    });

    return response;
  }

  async startRoom(userId, roomId) {
    const room = await LiveRoom.findOne({ _id: roomId, userId });
    if (!room) throw new AppError('NOT_FOUND', 404, 'Live room not found');
    if (room.status === 'ended') throw new AppError('LIVE_ROOM_ENDED', 400, 'Stream has ended');
    if (room.status === 'live') {
      const webrtcToken =
        (await livekitService.generateToken(room.livekitRoom, userId, 'host')) ||
        `dev_token_${room._id}`;
      return {
        room,
        webrtcToken,
        livekitUrl: livekitService.getPublicUrl(),
        livekitRoom: room.livekitRoom,
        livekitEnabled: livekitService.isReady(),
      };
    }

    if (room.scheduledAt && room.scheduledAt.getTime() > Date.now()) {
      throw new AppError('NOT_YET_SCHEDULED', 400, 'Cannot start before the scheduled time');
    }

    room.status = 'live';
    room.startedAt = new Date();
    await room.save();

    await Creator.findOneAndUpdate({ userId }, { isLive: true, currentLiveRoomId: room._id });

    try {
      const host = await User.findById(userId).select('username displayName');
      const followers = await Follower.find({ followingId: userId }).select('followerId');
      const followerIds = followers.map((f) => f.followerId.toString());
      if (followerIds.length > 0) {
        const activeFollowers = await User.find({
          _id: { $in: followerIds },
          isDeleted: false,
          $or: [
            { 'settings.notifications.liveAlerts': true },
            { 'settings.notifications.liveAlerts': { $exists: false } },
          ],
        }).select('_id');

        const targetIds = activeFollowers.map((u) => u._id.toString());
        if (targetIds.length > 0) {
          await notificationService.createForUsers(targetIds, {
            type: 'live',
            title: `${host?.displayName || host?.username || 'Creator'} is live`,
            body: `${host?.displayName || host?.username || 'A creator'} just started a live stream. Join now!`,
            data: {
              targetType: 'live',
              targetId: room._id,
              hostId: userId,
              hostUsername: host?.username,
              hostName: host?.displayName || host?.username,
              roomTitle: room.title,
            },
            sendPush: true,
          });
        }
      }
    } catch (err) {
      console.warn('[LiveService] live notification failed:', err.message || err);
    }

    const webrtcToken =
      (await livekitService.generateToken(room.livekitRoom, userId, 'host')) ||
      `dev_token_${room._id}`;

    return {
      room,
      webrtcToken,
      livekitUrl: livekitService.getPublicUrl(),
      livekitRoom: room.livekitRoom,
      livekitEnabled: livekitService.isReady(),
    };
  }

  hasPaidEntry(room, userId) {
    return (room.paidEntries || []).some((entry) => String(entry.userId) === String(userId));
  }

  async chargeEntryFee(userId, room) {
    const viewerWallet = await Wallet.findOne({ userId });
    if (!viewerWallet || viewerWallet.coinBalance < room.entryFeeCoins) {
      throw new AppError('INSUFFICIENT_COINS', 400, 'Not enough coins to enter this room');
    }

    await Wallet.findOneAndUpdate(
      { userId },
      { $inc: { coinBalance: -room.entryFeeCoins } },
      { upsert: true }
    );

    room.paidEntries = room.paidEntries || [];
    room.paidEntries.push({
      userId,
      paidAt: new Date(),
      amount: room.entryFeeCoins,
    });
    room.stats.entryFeeCoins = (room.stats.entryFeeCoins || 0) + room.entryFeeCoins;
  }

  async chargeEntryGift(userId, room) {
    const hostId = room.userId?._id || room.userId;
    if (room.entryGiftId) {
      await giftService.sendGift({
        senderId: userId,
        recipientId: hostId,
        giftId: room.entryGiftId,
        quantity: 1,
        context: { type: 'live', roomId: room._id.toString(), purpose: 'vip_entry' },
      });
      room.paidEntries = room.paidEntries || [];
      room.paidEntries.push({
        userId,
        paidAt: new Date(),
        amount: room.entryFeeCoins,
        giftId: room.entryGiftId,
      });
      room.stats.entryFeeCoins = (room.stats.entryFeeCoins || 0) + room.entryFeeCoins;
      return;
    }

    await this.chargeEntryFee(userId, room);
  }

  async joinRoom(userId, roomId) {
    const room = await LiveRoom.findById(roomId).populate('userId', 'username displayName avatar isVerified');
    if (!room) throw new AppError('NOT_FOUND', 404, 'Live room not found');
    if (room.status !== 'live') throw new AppError('LIVE_ROOM_ENDED', 400, 'Stream is not live');

    const isHost = String(room.userId?._id || room.userId) === String(userId);
    const isVip = room.roomType === 'vip';
    const alreadyPaid = this.hasPaidEntry(room, userId);
    const subscription = !isHost
      ? await Subscription.findOne({
          subscriberId: userId,
          creatorUserId: room.userId._id,
          status: 'active',
          currentPeriodEnd: { $gt: new Date() },
        }).populate('tierId', 'accessAllLive')
      : null;
    const hasSubscriptionAccess = Boolean(subscription?.tierId?.accessAllLive);

    if (!isHost && isVip) {
      const maxViewers = room.maxViewers ?? 1;
      if (!alreadyPaid && room.stats.currentViewers >= maxViewers) {
        throw new AppError('ROOM_FULL', 400, 'This VIP room already has a viewer');
      }
    }

    if (!isHost && !isVip && !alreadyPaid && room.stats.currentViewers >= room.maxGuests) {
      throw new AppError('ROOM_FULL', 400, 'This live room has reached its guest limit');
    }

    if (!isHost && room.entryFeeCoins > 0 && !alreadyPaid && !hasSubscriptionAccess) {
      await this.chargeEntryGift(userId, room);
    }

    if (!isHost && !alreadyPaid) {
      room.stats.currentViewers += 1;
      room.stats.totalViewers += 1;
      if (room.stats.currentViewers > room.stats.peakViewers) {
        room.stats.peakViewers = room.stats.currentViewers;
      }
      await room.save();
    } else if (!isHost && alreadyPaid) {
      await room.save();
    }

    let entryGift = null;
    if (room.entryGiftId) {
      entryGift = await Gift.findOne({ giftId: room.entryGiftId, isActive: true });
    }

    const webrtcToken =
      (await livekitService.generateToken(room.livekitRoom, userId, isHost ? 'host' : 'viewer')) ||
      `dev_viewer_${room._id}_${userId}`;

    const response = {
      roomId: room._id.toString(),
      webrtcToken,
      livekitUrl: livekitService.getPublicUrl(),
      livekitRoom: room.livekitRoom,
      livekitEnabled: livekitService.isReady(),
      host: {
        id: room.userId._id.toString(),
        username: room.userId.username,
        displayName: room.userId.displayName,
        avatar: room.userId.avatar,
      },
      viewerCount: room.stats.currentViewers,
      title: room.title,
      roomType: room.roomType || 'public',
      entryFeeCoins: room.entryFeeCoins,
      entryGiftId: room.entryGiftId,
      entryGift: entryGift
        ? {
            giftId: entryGift.giftId,
            name: entryGift.name,
            emoji: entryGift.emoji,
            coinCost: entryGift.coinCost,
          }
        : null,
      hasPaidEntry: isHost || alreadyPaid || hasSubscriptionAccess,
      hasSubscriptionAccess,
    };

    console.log('[LiveService] joinRoom response:', {
      roomType: response.roomType,
      livekitRoom: response.livekitRoom,
      livekitUrl: response.livekitUrl,
      tokenLength: response.webrtcToken?.length,
      livekitEnabled: response.livekitEnabled,
    });

    return response;
  }

  async leaveRoom(userId, roomId) {
    const room = await LiveRoom.findById(roomId);
    if (!room) throw new AppError('NOT_FOUND', 404, 'Live room not found');
    if (room.status !== 'live') return { left: true, viewerCount: 0 };

    room.stats.currentViewers = Math.max(0, room.stats.currentViewers - 1);
    await room.save();

    return { left: true, viewerCount: room.stats.currentViewers };
  }

  async getRoomById(roomId) {
    const room = await LiveRoom.findById(roomId).populate('userId', 'username displayName avatar isVerified');
    if (!room) throw new AppError('NOT_FOUND', 404, 'Live room not found');

    const giftMap = await this.loadGiftMap([room.entryGiftId]);
    const entryGift = room.entryGiftId ? giftMap[room.entryGiftId] : null;

    return {
      id: room._id.toString(),
      title: room.title,
      category: room.category,
      thumbnail: room.thumbnail,
      status: room.status,
      visibility: room.visibility,
      roomType: room.roomType || 'public',
      viewerCount: room.stats.currentViewers,
      peakViewers: room.stats.peakViewers,
      totalGifts: room.stats.totalGifts,
      host: {
        id: room.userId._id.toString(),
        username: room.userId.username,
        displayName: room.userId.displayName,
        avatar: room.userId.avatar,
        isVerified: room.userId.isVerified,
      },
      startedAt: room.startedAt,
      endedAt: room.endedAt,
      scheduledAt: room.scheduledAt,
      entryFeeCoins: room.entryFeeCoins,
      entryGiftId: room.entryGiftId,
      entryGift: entryGift
        ? {
            giftId: entryGift.giftId,
            name: entryGift.name,
            emoji: entryGift.emoji,
            coinCost: entryGift.coinCost,
          }
        : null,
    };
  }

  async endRoom(userId, roomId) {
    const room = await LiveRoom.findOne({ _id: roomId, userId });
    if (!room) throw new AppError('NOT_FOUND', 404, 'Live room not found');

    room.status = 'ended';
    room.endedAt = new Date();
    room.stats.duration = room.startedAt
      ? Math.floor((room.endedAt - room.startedAt) / 1000)
      : 0;
    await room.save();

    const entryFeeCoins = room.stats.entryFeeCoins || 0;
    const giftCoins = room.stats.totalGiftCoins || 0;
    const earningsBreakdown = this.calculateCreatorEarnings({
      entryFeeCoins,
      giftCoins,
      durationSeconds: room.stats.duration,
    });

    // Gifts are credited at the moment they're sent in GiftService.sendGift.
    // To avoid double-crediting, only credit non-gift components here
    // (entry fees + time bonus = totalCents - giftCents).
    const giftCents = earningsBreakdown.giftCents || 0;
    const nonGiftCents = Math.max(0, earningsBreakdown.totalCents - giftCents);

    if (nonGiftCents > 0) {
      await Creator.findOneAndUpdate(
        { userId },
        {
          $inc: {
            availableBalance: nonGiftCents,
            totalEarnings: nonGiftCents,
          },
          $set: { isLive: false, currentLiveRoomId: null },
        },
        { upsert: true }
      );
    } else {
      // still mark live as ended even if nothing to credit
      await Creator.findOneAndUpdate(
        { userId },
        { $set: { isLive: false, currentLiveRoomId: null } },
        { upsert: true }
      );
    }

    return {
      duration: room.stats.duration,
      peakViewers: room.stats.peakViewers,
      totalViewers: room.stats.totalViewers,
      totalGifts: room.stats.totalGifts,
      totalGiftCoins: room.stats.totalGiftCoins,
      earnings: (earningsBreakdown.totalCents / 100).toFixed(2),
      breakdown: {
        entryFee: (earningsBreakdown.entryFeeCents / 100).toFixed(2),
        gifts: (earningsBreakdown.giftCents / 100).toFixed(2),
        timeBonus: (earningsBreakdown.timeBonusCents / 100).toFixed(2),
      },
    };
  }

  async getActiveRooms({ skip, limit, category }) {
    const filter = { status: 'live', roomType: { $ne: 'vip' } };
    if (category) filter.category = category;

    const [rooms, total] = await Promise.all([
      LiveRoom.find(filter)
        .sort({ 'stats.currentViewers': -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'username displayName avatar isVerified'),
      LiveRoom.countDocuments(filter),
    ]);

    return {
      rooms: rooms.map((r) => this.mapRoomSummary(r)),
      total,
    };
  }

  async getVipRooms({ skip, limit, includeScheduled = true }) {
    const statuses = includeScheduled ? ['waiting', 'live'] : ['live'];
    const filter = {
      roomType: 'vip',
      status: { $in: statuses },
    };

    const [rooms, total] = await Promise.all([
      LiveRoom.find(filter)
        .sort({ status: -1, scheduledAt: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'username displayName avatar isVerified'),
      LiveRoom.countDocuments(filter),
    ]);

    const giftMap = await this.loadGiftMap(rooms.map((room) => room.entryGiftId));

    return {
      rooms: rooms.map((r) => ({
        ...this.mapRoomSummary(r, giftMap),
        isJoinable: r.status === 'live' && r.stats.currentViewers < (r.maxViewers ?? 1),
      })),
      total,
    };
  }
}

module.exports = new LiveService();
