import { Router } from 'express';
import { db } from '../db/client.js';
import { clients } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

// Get branding configuration by domain
router.get('/api/branding', async (req, res) => {
  try {
    const { domain } = req.query;
    
    if (!domain || typeof domain !== 'string') {
      return res.status(400).json({ 
        error: 'Domain parameter is required' 
      });
    }

    // Look up client by domain
    const client = await db
      .select()
      .from(clients)
      .where(eq(clients.domain, domain))
      .limit(1);

    if (client.length === 0) {
      // Return default branding for unknown domains
      return res.json({
        branding: {
          companyName: 'CCL3 Platform',
          primaryColor: '#2563eb',
          secondaryColor: '#1d4ed8',
          emailFromName: 'CCL3 Support',
          supportEmail: 'support@ccl3-platform.com'
        }
      });
    }

    const brandingConfig = client[0].brandingConfig;
    
    return res.json({
      branding: brandingConfig,
      clientId: client[0].id
    });
  } catch (error) {
    console.error('Error fetching branding:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch branding configuration' 
    });
  }
});

export default router;
