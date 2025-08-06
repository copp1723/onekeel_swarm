import { relations } from "drizzle-orm/relations";
import { users, sessions, campaigns, leads } from "./schema";

export const sessionsRelations = relations(sessions, ({one}) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	sessions: many(sessions),
	campaigns: many(campaigns),
}));

export const campaignsRelations = relations(campaigns, ({one, many}) => ({
	user: one(users, {
		fields: [campaigns.userId],
		references: [users.id]
	}),
	leads: many(leads),
}));

export const leadsRelations = relations(leads, ({one}) => ({
	campaign: one(campaigns, {
		fields: [leads.campaignId],
		references: [campaigns.id]
	}),
}));