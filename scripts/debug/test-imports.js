console.log('Testing imports...');
try {
  const { db } = require('./server/db/index');
  const { campaigns, leadCampaignEnrollments, leads } = require('./server/db/schema');
  
  console.log('Schema objects exist:', !!campaigns, !!leadCampaignEnrollments, !!leads);
  console.log('Campaign object type:', typeof campaigns);
  console.log('Leads object type:', typeof leads);
  console.log('Enrollments object type:', typeof leadCampaignEnrollments);
  
  if (campaigns) {
    console.log('Campaign keys:', Object.keys(campaigns));
  }
  if (leads) {
    console.log('Leads keys:', Object.keys(leads));
  }
  if (leadCampaignEnrollments) {
    console.log('Enrollments keys:', Object.keys(leadCampaignEnrollments));
  }
} catch (error) {
  console.error('Import error:', error.message);
}