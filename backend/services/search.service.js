const User = require('../models/User.model');
const Creator = require('../models/Creator.model');
const Post = require('../models/Post.model');
const LiveRoom = require('../models/LiveRoom.model');

class SearchService {
  async search(query, type, { skip, limit }) {
    const q = query.trim();
    if (q.length < 2) return { creators: [], posts: [], live: [] };

    const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedQuery, 'i');
    const tokenRegex = new RegExp(`(^|\\s)${escapedQuery}(\\s|$)`, 'i');

    if (type === 'creators' || type === 'all') {
      const users = await User.find({
        isDeleted: false,
        isCreator: true,
        $or: [
          { username: regex },
          { displayName: regex },
          { bio: regex },
          { username: tokenRegex },
          { displayName: tokenRegex },
          { bio: tokenRegex },
        ],
      })
        .limit(type === 'all' ? 5 : limit)
        .skip(type === 'all' ? 0 : skip)
        .select('username displayName avatar isVerified isCreator bio');

      if (type === 'creators') {
        return {
          creators: users.map(formatCreatorResult),
          total: await User.countDocuments({
            isDeleted: false,
            isCreator: true,
            $or: [
            { username: regex },
            { displayName: regex },
            { bio: regex },
            { username: tokenRegex },
            { displayName: tokenRegex },
            { bio: tokenRegex },
          ],
          }),
        };
      }
    }

    const results = { creators: [], posts: [], live: [] };

    if (type === 'all' || type === 'creators') {
      const users = await User.find({
        isDeleted: false,
        isCreator: true,
        $or: [
          { username: regex },
          { displayName: regex },
          { bio: regex },
          { username: tokenRegex },
          { displayName: tokenRegex },
          { bio: tokenRegex },
        ],
      })
        .limit(5)
        .select('username displayName avatar isVerified bio');
      results.creators = users.map(formatCreatorResult);
    }

    if (type === 'all' || type === 'posts') {
      const posts = await Post.find({
        isDeleted: false,
        visibility: 'public',
        $or: [
          { caption: regex },
          { hashtags: regex },
          { caption: tokenRegex },
          { hashtags: tokenRegex },
        ],
      })
        .limit(type === 'all' ? 5 : limit)
        .skip(type === 'all' ? 0 : skip)
        .populate('userId', 'username displayName avatar');
      results.posts = posts.map((p) => ({
        id: p._id.toString(),
        caption: p.caption,
        type: p.type,
        media: p.media,
        creator: {
          username: p.userId.username,
          displayName: p.userId.displayName,
          avatar: p.userId.avatar,
        },
      }));
    }

    if (type === 'all' || type === 'live') {
      const rooms = await LiveRoom.find({
        status: 'live',
        $or: [{ title: regex }, { title: tokenRegex }],
      })
        .limit(type === 'all' ? 5 : limit)
        .populate('userId', 'username displayName avatar');
      results.live = rooms.map((r) => ({
        id: r._id.toString(),
        title: r.title,
        viewerCount: r.stats.currentViewers,
        host: {
          username: r.userId.username,
          displayName: r.userId.displayName,
        },
      }));
    }

    return results;
  }
}

const formatCreatorResult = (u) => ({
  id: u._id.toString(),
  username: u.username,
  displayName: u.displayName,
  avatar: u.avatar,
  isVerified: u.isVerified,
  bio: u.bio,
});

module.exports = new SearchService();
