import { db } from './server/db/client';
import { campaigns, leadCampaignEnrollments, leads } from './server/db/schema';
import { eq } from 'drizzle-orm';

async function debugSchemaIssue() {
  try {
    console.log('Testing campaign schema queries...');
    
    // Test 1: Simple campaigns query
    console.log('1. Testing campaigns query...');
    const campaignQuery = await db
      .select()
      .from(campaigns)
      .limit(1);
    console.log('✅ Campaigns query works:', campaignQuery.length);
    
    // Test 2: Simple leads query
    console.log('2. Testing leads query...');
    const leadsQuery = await db
      .select()
      .from(leads)
      .limit(1);
    console.log('✅ Leads query works:', leadsQuery.length);
    
    // Test 3: Simple enrollments query
    console.log('3. Testing leadCampaignEnrollments query...');
    const enrollmentsQuery = await db
      .select()
      .from(leadCampaignEnrollments)
      .limit(1);
    console.log('✅ Enrollments query works:', enrollmentsQuery.length);
    
    // Test 4: Simple join query with all fields
    console.log('4. Testing join query with .select()...');
    const joinQuery = await db
      .select()
      .from(leadCampaignEnrollments)
      .innerJoin(leads, eq(leadCampaignEnrollments.leadId, leads.id))
      .limit(1);
    console.log('✅ Join query works:', joinQuery.length);

    // Test 5: Specific field selection
    console.log('5. Testing specific fields selection...');
    try {
      const specificQuery = await db
        .select({
          enrollmentId: leadCampaignEnrollments.id,
          email: leads.email,
        })
        .from(leadCampaignEnrollments)
        .innerJoin(leads, eq(leadCampaignEnrollments.leadId, leads.id))
        .limit(1);
      console.log('✅ Specific fields query works:', specificQuery.length);
    } catch (error) {
      console.error('❌ Specific fields query failed:', error);
    }

    console.log('All tests completed!');
    
  } catch (error) {
    console.error('❌ Schema debug failed:', error);
  }
}

debugSchemaIssue().then(() => process.exit(0));