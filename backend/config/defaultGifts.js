/** Default live-stream gift catalog — upserted on seed and when catalog is empty. */
const DEFAULT_GIFTS = [
  { giftId: 'gift_rose', name: 'Rose', emoji: '🌹', coinCost: 10, category: 'basic', sortOrder: 1 },
  { giftId: 'gift_kiss', name: 'Kiss', emoji: '💋', coinCost: 15, category: 'basic', sortOrder: 2 },
  { giftId: 'gift_coffee', name: 'Coffee', emoji: '☕', coinCost: 20, category: 'basic', sortOrder: 3 },
  { giftId: 'gift_teddy', name: 'Teddy Bear', emoji: '🧸', coinCost: 25, category: 'basic', sortOrder: 4 },
  { giftId: 'gift_heart', name: 'Heart', emoji: '❤️', coinCost: 50, category: 'basic', sortOrder: 5 },
  { giftId: 'gift_fire', name: 'Fire', emoji: '🔥', coinCost: 75, category: 'basic', sortOrder: 6 },
  { giftId: 'gift_star', name: 'Star', emoji: '⭐', coinCost: 100, category: 'popular', sortOrder: 7 },
  { giftId: 'gift_cake', name: 'Cake', emoji: '🎂', coinCost: 150, category: 'popular', sortOrder: 8 },
  { giftId: 'gift_party', name: 'Party', emoji: '🎉', coinCost: 120, category: 'popular', sortOrder: 9 },
  { giftId: 'gift_diamond', name: 'Diamond', emoji: '💎', coinCost: 200, category: 'popular', sortOrder: 10 },
  { giftId: 'gift_crown', name: 'Crown', emoji: '👑', coinCost: 500, category: 'premium', sortOrder: 11 },
  { giftId: 'gift_rocket', name: 'Rocket', emoji: '🚀', coinCost: 1000, category: 'premium', sortOrder: 12 },
  { giftId: 'gift_car', name: 'Sports Car', emoji: '🏎️', coinCost: 2000, category: 'premium', sortOrder: 13 },
  { giftId: 'gift_yacht', name: 'Yacht', emoji: '🛥️', coinCost: 3000, category: 'premium', sortOrder: 14 },
  { giftId: 'gift_castle', name: 'Castle', emoji: '🏰', coinCost: 5000, category: 'exclusive', sortOrder: 15 },
  { giftId: 'gift_dragon', name: 'Dragon', emoji: '🐉', coinCost: 7500, category: 'exclusive', sortOrder: 16 },
  { giftId: 'gift_universe', name: 'Universe', emoji: '🌌', coinCost: 10000, category: 'exclusive', sortOrder: 17 },
];

module.exports = { DEFAULT_GIFTS };
