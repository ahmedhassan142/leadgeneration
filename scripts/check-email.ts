// scripts/check-lead-emails.ts
import mongoose from 'mongoose';
import { Lead } from '@/lib/db/models/Lead';

const MONGODB_URI = 'mongodb+srv://ah770643:PASSWORD_REMOVED@cluster0.bdbqw.mongodb.net/lead?retryWrites=true&w=majority&appName=Cluster0';

async function checkLeadEmails() {
  await mongoose.connect(MONGODB_URI);
  
  const leads = await Lead.find({ 
    $or: [{ quality: 'cold' }, { score: { $lt: 40 } }]
  }).limit(5);
  
  console.log('Lead Email Check:');
  leads.forEach(lead => {
    console.log(`\nLead: ${lead.name}`);
    console.log(`  emails array: ${JSON.stringify(lead.emails)}`);
    console.log(`  email field: ${lead.email}`);
    console.log(`  Has valid email: ${lead.emails?.[0] || lead.email}`);
  });
  
  process.exit(0);
}

checkLeadEmails();