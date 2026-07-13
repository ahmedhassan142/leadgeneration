// Remove test leads created during smoke tests
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection.db;
  if (!db) throw new Error('no db');
  // Remove leads with the test-business.com website or "Test User -" name
  const leadRes = await db.collection('leads').deleteMany({
    $or: [
      { website: 'https://test-business.com' },
      { name: /^Test User -/ },
    ],
  });
  console.log('Deleted test leads:', leadRes.deletedCount);
  const outRes = await db.collection('outreaches').deleteMany({
    $or: [
      { sequenceId: 'test-1min' },
      { sequenceId: 'test-1min-warm' },
      { sequenceName: /TEST SEQUENCE/ },
    ],
  });
  console.log('Deleted test outreaches:', outRes.deletedCount);
  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
