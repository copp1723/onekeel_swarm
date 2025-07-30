import { db } from '../server/db';
import { templates } from '../server/db/schema';
import { v4 as uuidv4 } from 'uuid';

const seedTemplates = [
  // Welcome Templates
  {
    id: uuidv4(),
    name: 'Welcome Email - New Customer',
    description: 'Welcome email for new customers with product introduction',
    channel: 'email' as const,
    category: 'welcome',
    subject: 'Welcome to {{companyName}}, {{firstName}}!',
    content: `Hi {{firstName}},

Welcome to {{companyName}}! We're thrilled to have you join our community.

We're here to help you get the most out of {{productName}}. Here's what you can expect:

✓ Quick setup guides to get you started
✓ 24/7 customer support whenever you need help
✓ Regular tips and updates to maximize your experience

To get started, simply log in to your account and explore all the features available to you.

If you have any questions, don't hesitate to reach out. We're here to help!

Best regards,
The {{companyName}} Team`,
    variables: ['companyName', 'firstName', 'productName'],
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  
  // Follow-up Templates
  {
    id: uuidv4(),
    name: 'Follow-up - Initial Contact',
    description: 'First follow-up after initial contact or inquiry',
    channel: 'email' as const,
    category: 'follow-up',
    subject: 'Following up on your {{productName}} inquiry',
    content: `Hi {{firstName}},

I wanted to follow up on your recent inquiry about {{productName}}.

I noticed you were interested in learning more about how we can help with {{painPoint}}. I'd love to discuss how {{productName}} can specifically address your needs.

Are you available for a quick 15-minute call this week? I have some time slots available:
- {{timeSlot1}}
- {{timeSlot2}}
- {{timeSlot3}}

Looking forward to connecting with you!

Best regards,
{{senderName}}
{{companyName}}`,
    variables: ['firstName', 'productName', 'painPoint', 'timeSlot1', 'timeSlot2', 'timeSlot3', 'senderName', 'companyName'],
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  
  // Promotion Templates
  {
    id: uuidv4(),
    name: 'Limited Time Offer',
    description: 'Promotional email for limited time offers',
    channel: 'email' as const,
    category: 'promotion',
    subject: '{{firstName}}, Save {{discountPercent}}% on {{productName}} - This Week Only!',
    content: `Hi {{firstName}},

Great news! For this week only, we're offering an exclusive {{discountPercent}}% discount on {{productName}}.

This is your chance to get the solution you've been looking for at an unbeatable price.

**Your Exclusive Offer:**
- {{discountPercent}}% off regular price
- Valid until {{expiryDate}}
- Use code: {{promoCode}}

[Claim Your Discount Now]

Don't miss out - this offer expires in {{daysRemaining}} days!

Best regards,
The {{companyName}} Team

P.S. This offer is exclusive to our valued customers like you. Act fast before it's gone!`,
    variables: ['firstName', 'discountPercent', 'productName', 'expiryDate', 'promoCode', 'daysRemaining', 'companyName'],
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  
  // SMS Templates
  {
    id: uuidv4(),
    name: 'Appointment Reminder SMS',
    description: 'SMS reminder for upcoming appointments',
    channel: 'sms' as const,
    category: 'reminder',
    subject: '',
    content: `Hi {{firstName}}, this is a reminder about your appointment on {{appointmentDate}} at {{appointmentTime}}. Reply YES to confirm or call {{phoneNumber}} to reschedule.`,
    variables: ['firstName', 'appointmentDate', 'appointmentTime', 'phoneNumber'],
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  
  {
    id: uuidv4(),
    name: 'Quick Follow-up SMS',
    description: 'Brief SMS follow-up after initial contact',
    channel: 'sms' as const,
    category: 'follow-up',
    subject: '',
    content: `Hi {{firstName}}, just following up on our conversation about {{topic}}. Do you have any questions? Text back or call {{phoneNumber}} when you're ready to move forward.`,
    variables: ['firstName', 'topic', 'phoneNumber'],
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  
  // Custom Templates
  {
    id: uuidv4(),
    name: 'Re-engagement Campaign',
    description: 'Win back inactive customers',
    channel: 'email' as const,
    category: 'custom',
    subject: 'We miss you, {{firstName}}! Here\'s something special for you',
    content: `Hi {{firstName}},

It's been a while since we last connected, and we wanted to reach out to see how you're doing.

We've made some exciting improvements to {{productName}} that we think you'll love:

{{improvement1}}
{{improvement2}}
{{improvement3}}

As a valued member of our community, we'd love to have you back. Here's an exclusive offer just for you:

**{{specialOffer}}**

This offer is valid for the next {{validityDays}} days, exclusively for you.

[Redeem Your Offer]

We'd love to hear from you. If there's anything we can do to improve your experience, please let us know.

Looking forward to seeing you again!

Warm regards,
The {{companyName}} Team`,
    variables: ['firstName', 'productName', 'improvement1', 'improvement2', 'improvement3', 'specialOffer', 'validityDays', 'companyName'],
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function seed() {
  try {
    console.log('Seeding templates...');
    
    // Insert templates
    for (const template of seedTemplates) {
      await db.insert(templates).values(template).onConflictDoNothing();
    }
    
    console.log('Templates seeded successfully!');
  } catch (error) {
    console.error('Error seeding templates:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

seed();