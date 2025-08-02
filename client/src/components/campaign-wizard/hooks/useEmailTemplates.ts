import { CampaignData } from '../types';

export async function generateTemplates(
  data: CampaignData,
  setData: React.Dispatch<React.SetStateAction<CampaignData>>
) {
  const { offer, schedule } = data;
  try {
    const res = await fetch('/api/agents/email/generate-sequence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignName: data.name || 'Outreach Campaign',
        goal: data.goal || 'Increase conversions',
        context: data.context,
        product: offer.product || 'product',
        benefits: offer.keyBenefits.length
          ? offer.keyBenefits
          : ['Save time', 'Expert support'],
        priceAngle: offer.pricing || 'Competitive',
        urgency: offer.urgency || 'Limited time',
        disclaimer: offer.disclaimer,
        primaryCTA: offer.cta.primary || 'Learn more',
        CTAurl: offer.cta.link || '#',
      }),
    });
    if (!res.ok) throw new Error(`${res.status}`);

    const { sequence } = await res.json();
    const templates = sequence.map((e: any, i: number) => ({
      id: `template-${i + 1}`,
      subject: e.subject,
      body: e.body,
      order: e.order || i + 1,
      daysSinceStart: i * schedule.daysBetweenEmails + 1,
    }));
    setData(d => ({ ...d, templates }));
  } catch {
    /* fallback identical to original logic */
    const t: number[] = Array.from(
      { length: schedule.totalEmails },
      (_, i) => i
    );
    setData(d => ({
      ...d,
      templates: t.map(i => ({
        id: `template-${i + 1}`,
        subject: generateSubjectLine(i + 1, offer),
        body: generateEmailBody(i + 1, i / (schedule.totalEmails - 1), data),
        order: i + 1,
        daysSinceStart: i * schedule.daysBetweenEmails + 1,
      })),
    }));
  }
}

const generateSubjectLine = (
  emailNumber: number,
  offer: CampaignData['offer']
) => {
  const product = offer.product || 'vehicle financing';
  const subjects = [
    `Quick question about your ${product} needs`,
    `Great ${product} options available for you`,
    `Customer success story you'll love`,
    `I've been thinking about your vehicle needs`,
    `Last chance - ${product} opportunity`,
  ];

  return subjects[Math.min(emailNumber - 1, subjects.length - 1)];
};

const generateEmailBody = (
  emailNumber: number,
  urgencyLevel: number,
  data: CampaignData
) => {
  const { product, pricing, cta, disclaimer } = data.offer;
  const context = data.context;

  // Automotive dealership sales representative approach
  const intro =
    emailNumber === 1
      ? `Hi {firstName},\n\nThanks for your interest in ${product || 'vehicle financing'}! I'm excited to help you find the perfect vehicle solution.`
      : `Hi {firstName},\n\nI wanted to follow up on your vehicle interest. We have some fantastic options that might be perfect for you.`;

  const body =
    urgencyLevel < 0.5
      ? `${context ? 'Based on your situation, ' : ''}${product ? `our ${product} offers` : 'we offer'} ${pricing || 'competitive financing rates'} and flexible terms.\n\n${data.goal ? `Our goal: ${data.goal}` : "We're here to help you drive home in the perfect vehicle."}`
      : `This is a limited-time opportunity! ${data.offer.urgency || "These rates won't last long"}, and I don\'t want you to miss out.\n\n${pricing ? `With ${pricing}, ` : ''}${product || 'this vehicle financing'} could be exactly what you\'ve been looking for.`;

  const ctaSection = cta.primary
    ? `\n\n[${cta.primary}](${cta.link || '#'})\n\n${cta.secondary || 'Or reply to this email with any questions.'}`
    : "\n\nReply to this email or give me a call if you'd like to discuss your vehicle options.";

  const footer = disclaimer
    ? `\n\nBest regards,\n{agentName}\n\n${disclaimer}`
    : '\n\nBest regards,\n{agentName}';

  return intro + '\n\n' + body + ctaSection + footer;
};
