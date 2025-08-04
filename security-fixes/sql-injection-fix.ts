// SQL Injection Prevention Fix for campaigns.ts

import { inArray } from 'drizzle-orm';

// Replace vulnerable SQL concatenation with safe parameterized queries
// Line 161 fix:
const enrollmentStats = await db
  .select({
    campaignId: leadCampaignEnrollments.campaignId,
    totalLeads: sql<number>`count(*)::int`,
    activeLeads: sql<number>`count(*) filter (where status = 'active')::int`,
    completedLeads: sql<number>`count(*) filter (where completed = true)::int`,
  })
  .from(leadCampaignEnrollments)
  .where(inArray(leadCampaignEnrollments.campaignId, campaignIds))
  .groupBy(leadCampaignEnrollments.campaignId);

// Line 511 fix - use parameterized IN clause:
const leadDetails = await db
  .select()
  .from(leads)
  .where(inArray(leads.id, leadIds))
  .limit(leadIds.length);

// Add input validation for all IDs
const validateId = (id: string): boolean => {
  // UUID v4 pattern
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  // Custom ID pattern (lead_timestamp_random)
  const customPattern = /^[a-zA-Z]+_\d+_[a-zA-Z0-9]+$/;

  return uuidPattern.test(id) || customPattern.test(id);
};

// Apply validation before any database operation
if (!leadIds.every(validateId)) {
  throw new Error('Invalid lead ID format detected');
}
