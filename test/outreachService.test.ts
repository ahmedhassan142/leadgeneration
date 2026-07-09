// tests/outreachService.test.ts
import { outreachService } from '@/lib/services/outreachservice';
import connectToDatabase from '@/lib/db/connect';
import { Lead } from '@/lib/db/models/Lead';
import { Outreach } from '@/lib/db/models/Outreach';

describe('OutreachService', () => {
  
  // Setup - clean database before each test
  beforeEach(async () => {
    await connectToDatabase();
    await Outreach.deleteMany({});
    await Lead.deleteMany({});
  });

  test('startOutreach should create outreach record', async () => {
    // Create a test lead first
    const lead = await Lead.create({
      name: 'Test Company',
      emails: ['test@company.com'],
      quality: 'hot',
      source: 'test'
    });

    // Start outreach
    const result = await outreachService.startOutreach({
      leadId: lead._id.toString(),
      leadType: 'main'
    });

    expect(result).not.toBeNull();
    expect(result?.status).toBe('active');
    expect(result?.leadSnapshot.email).toBe('test@company.com');
  });

  test('sendNextEmail should send first email', async () => {
    const lead = await Lead.create({
      name: 'Test Company',
      emails: ['test@company.com'],
      quality: 'hot'
    });

    const outreach = await outreachService.startOutreach({
      leadId: lead._id.toString(),
      leadType: 'main'
    });

    const result = await outreachService.sendNextEmail(outreach!._id.toString());
    expect(result).toBe(true);

    const updated = await Outreach.findById(outreach!._id);
    expect(updated?.emails.length).toBe(1);
    expect(updated?.currentStep).toBe(1);
  });
});