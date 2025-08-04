console.log('Testing campaign-executor imports...');
try {
  const { db } = await import('./server/db/index');
  const { campaigns, leadCampaignEnrollments, leads } = await import('./server/db/schema');
  
  console.log('Schema objects exist:', !!campaigns, !!leadCampaignEnrollments, !!leads);
  console.log('Campaign object type:', typeof campaigns);
  console.log('Leads object type:', typeof leads);
  console.log('Enrollments object type:', typeof leadCampaignEnrollments);
  
  // Check if fields are available
  if (campaigns && campaigns.id) {
    console.log('Campaign id field exists:', !!campaigns.id);
  }
  if (leads && leads.email) {
    console.log('Leads email field exists:', !!leads.email);
  }
  if (leadCampaignEnrollments && leadCampaignEnrollments.id) {
    console.log('Enrollments id field exists:', !!leadCampaignEnrollments.id);
  }
  
  console.log('Testing simple queries...');
  
  // Test the problematic query structure
  const query = db
    .select()
    .from(leadCampaignEnrollments)
    .innerJoin(leads, () => true) // Simple join condition
    .limit(1);
    
  console.log('Query created successfully');
  
} catch (error) {
  console.error('Test error:', error);
}