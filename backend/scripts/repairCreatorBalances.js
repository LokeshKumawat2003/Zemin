require('dotenv').config();
const mongoose = require('mongoose');
const Creator = require('../models/Creator.model');

// Usage:
//  node scripts/repairCreatorBalances.js <scale> [--apply]
// Example (to convert 0.64 -> 1.0):
//  node scripts/repairCreatorBalances.js 1.5625 --apply

const argv = process.argv.slice(2);
if (argv.length < 1) {
  console.log('Usage: node scripts/repairCreatorBalances.js <scale> [--apply]');
  process.exit(1);
}

const scale = Number(argv[0]);
const apply = argv.includes('--apply');

if (Number.isNaN(scale) || scale <= 0) {
  console.error('Invalid scale value');
  process.exit(1);
}

(async () => {
  try {
    const uri = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/zemin';
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

    const creators = await Creator.find({});
    console.log(`Found ${creators.length} creators. Dry run: ${!apply}`);

    for (const c of creators) {
      const beforeAvailable = c.availableBalance || 0;
      const beforeTotal = c.totalEarnings || 0;
      const afterAvailable = Math.round(beforeAvailable * scale);
      const afterTotal = Math.round(beforeTotal * scale);

      console.log(`creator ${c._id} | available: ${beforeAvailable} -> ${afterAvailable} | total: ${beforeTotal} -> ${afterTotal}`);

      if (apply) {
        await Creator.updateOne({ _id: c._id }, { $set: { availableBalance: afterAvailable, totalEarnings: afterTotal } });
      }
    }

    console.log('Done.');
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
})();
