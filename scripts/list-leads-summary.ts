import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
import mongoose from 'mongoose';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection.db!;
  const leads = db.collection('leads');
  const inbound = db.collection('inboundleads');

  const totalLeads = await leads.countDocuments();
  const totalInbound = await inbound ? await inbound.countDocuments() : 0;

  console.log('\n=== DATABASE SUMMARY ===');
  console.log(`Leads collection:        ${totalLeads}`);
  console.log(`InboundLeads collection: ${totalInbound}`);

  const bySource = await leads.aggregate([
    { $group: { _id: '$source', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]).toArray();
  console.log('\nLeads by source:');
  for (const s of bySource) console.log(`  ${s._id || '?'}: ${s.count}`);

  if (inbound) {
    const inboundBySource = await inbound.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).toArray();
    console.log('\nInbound leads by source:');
    for (const s of inboundBySource) console.log(`  ${s._id || '?'}: ${s.count}`);
  }

  console.log('\n=== 6 MOST RECENT INBOUND LEADS (mobile-app scrape) ===');
  if (inbound) {
    const recent = await inbound.find({}).sort({ createdAt: -1 }).limit(6).toArray();
    for (const l of recent) {
      console.log(`  • [${l.source || l.platform || '?'}] ${l.name} | score=${l.score ?? '?'} (${l.quality || '?'})`);
    }
  }

  await mongoose.disconnect();
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
