// List all leads in the database grouped by source
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection.db!;
  const leads = db.collection('leads');

  const total = await leads.countDocuments();
  console.log(`\n=== LEADS IN DATABASE ===`);
  console.log(`Total: ${total}\n`);

  // Group by source
  const bySource = await leads.aggregate([
    { $group: { _id: '$source', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]).toArray();
  console.log('By source:');
  for (const s of bySource) console.log(`  ${s._id || '(none)'}: ${s.count}`);

  // Group by quality
  const byQuality = await leads.aggregate([
    { $group: { _id: '$quality', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]).toArray();
  console.log('\nBy quality:');
  for (const q of byQuality) console.log(`  ${q._id || '(none)'}: ${q.count}`);

  // Show 8 most recent leads
  console.log('\n=== 8 MOST RECENT LEADS ===');
  const recent = await leads
    .find({})
    .sort({ createdAt: -1 })
    .limit(8)
    .toArray();
  for (const l of recent) {
    console.log(
      `  • [${l.source || '?'}] ${l.name} | ${(l.emails || []).length} email(s) | score=${l.score ?? '?'} (${l.quality || '?'}) | ${l.website || 'no website'}`
    );
  }

  // Show 5 HOT leads (score >= 60)
  console.log('\n=== TOP 5 HOT LEADS (score >= 60) ===');
  const hot = await leads
    .find({ score: { $gte: 60 } })
    .sort({ score: -1 })
    .limit(5)
    .toArray();
  if (hot.length === 0) console.log('  (none yet)');
  for (const l of hot) {
    console.log(
      `  🔥 ${l.name} | score=${l.score} | emails=${(l.emails || []).length} | ${l.website}`
    );
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
