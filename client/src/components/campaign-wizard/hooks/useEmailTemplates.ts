import { CampaignData } from '../types';

export async function generateTemplates(
  data: CampaignData,
  setData: React.Dispatch<React.SetStateAction<CampaignData>>,
) {
  const { offer, schedule } = data;
  try {
    const res = await fetch('/api/agents/email/generate-sequence', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        campaignName: data.name || 'Outreach Campaign',
        goal: data.goal  || 'Increase conversions',
        context: data.context,
        product: offer.product || 'product',
        benefits: offer.keyBenefits.length?
                  offer.keyBenefits : ['Save time','Expert support'],
        priceAngle: offer.pricing || 'Competitive',
        urgency: offer.urgency || 'Limited time',
        disclaimer: offer.disclaimer,
        primaryCTA: offer.cta.primary || 'Learn more',
        CTAurl: offer.cta.link || '#',
      }),
    });
    if (!res.ok) throw new Error(`${res.status}`);

    const { sequence } = await res.json();
    const templates = sequence.map((e:any,i:number)=>({
      id:`template-${i+1}`,
      subject:e.subject,
      body:e.body,
      order:e.order||i+1,
      daysSinceStart:i*schedule.daysBetweenEmails+1,
    }));
    setData(d=>({...d,templates}));
  } catch {
    /* fallback identical to original logic */
    const t:number[] = Array.from({length:schedule.totalEmails}, (_,i)=>i);
    setData(d=>({
      ...d,
      templates: t.map(i=>({
        id:`template-${i+1}`,
        subject:generateSubjectLine(i+1, offer),
        body:generateEmailBody(i+1, i/(schedule.totalEmails-1), data),
        order:i+1,
        daysSinceStart:i*schedule.daysBetweenEmails+1,
      })),
    }));
  }
}

const generateSubjectLine = (emailNumber: number, offer: CampaignData['offer']) => {
  const product = offer.product || 'our financing solution';
  const subjects = [
    `Interested in ${product}? Let's explore your options`,
    `Quick update on ${product} - rates still available`,
    `Don't miss out: ${product} application deadline approaching`,
    `Final reminder: ${product} offer expires soon`,
    `Last chance: ${product} - shall we proceed?`
  ];
  
  return subjects[Math.min(emailNumber - 1, subjects.length - 1)];
};

const generateEmailBody = (emailNumber: number, urgencyLevel: number, data: CampaignData) => {
  const { product, pricing, cta, disclaimer } = data.offer;
  const context = data.context;
  
  const intro = emailNumber === 1 
    ? `Hi {firstName},\n\nI hope this email finds you well! I wanted to reach out regarding ${product || 'our financing options'}.`
    : `Hi {firstName},\n\nI wanted to follow up on ${product || 'the financing opportunity'} I mentioned earlier.`;
  
  const body = urgencyLevel < 0.5 
    ? `${context ? 'Based on your interest, ' : ''}${product ? `Our ${product} offers` : 'We offer'} ${pricing || 'competitive rates'} that could save you money.\n\n${data.goal ? `Our goal is simple: ${data.goal}` : 'We\'re here to help you achieve your financial goals.'}`
    : `Time is running out! ${data.offer.urgency || 'This offer won\'t last long'}, and I don\'t want you to miss this opportunity.\n\n${pricing ? `With rates starting at ${pricing}, ` : ''}${product || 'This solution'} could be exactly what you've been looking for.`;
  
  const ctaSection = cta.primary 
    ? `\n\n[${cta.primary}](${cta.link || '#'})\n\n${cta.secondary || 'Or reply to this email with any questions.'}`
    : '\n\nReply to this email or give me a call if you\'d like to discuss further.';
  
  const footer = disclaimer 
    ? `\n\nBest regards,\n{agentName}\n\n---\n${disclaimer}`
    : '\n\nBest regards,\n{agentName}';
  
  return intro + '\n\n' + body + ctaSection + footer;
};