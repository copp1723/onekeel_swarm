import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation';
import { requireAuth } from '../middleware/auth';
import { dualTerminologyService } from '../services/dual-terminology-service';
import { featureFlagService } from '../services/feature-flag-service';

const router = Router();

// Extract feature flag context from request
const extractContext = (req: any) => ({
  userId: req.user?.id,
  userRole: req.user?.role,
  environment: process.env.NODE_ENV as any || 'development'
});

// Validation schemas (same as leads but with contact terminology)
const createContactSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  source: z.string().default('api'),
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'rejected']).default('new'),
  qualificationScore: z.number().min(0).max(100).optional(),
  assignedChannel: z.enum(['email', 'sms', 'chat']).optional(),
  boberdooId: z.string().optional(),
  campaignId: z.string().uuid().optional(),
  creditScore: z.number().optional(),
  income: z.number().optional(),
  employer: z.string().optional(),
  jobTitle: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  notes: z.string().optional()
});

const updateContactSchema = createContactSchema.partial();

// Get all contacts
router.get('/', requireAuth, async (req, res) => {
  try {
    const context = extractContext(req);
    const { 
      status, 
      source, 
      assignedChannel,
      search, 
      limit = 50, 
      offset = 0, 
      sort = 'createdAt', 
      order = 'desc' 
    } = req.query;

    const result = await dualTerminologyService.getEntities({
      status: status as string,
      source: source as string,
      assignedChannel: assignedChannel as string,
      search: search as string,
      limit: Number(limit),
      offset: Number(offset),
      sort: sort as string,
      order: order as 'asc' | 'desc'
    }, context);

    const response = {
      success: true,
      contacts: result.entities,
      total: result.total,
      offset: result.offset,
      limit: result.limit,
      terminology: result.terminology,
      timestamp: new Date().toISOString()
    };

    res.json(dualTerminologyService.getApiResponse(response, result.terminology));
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONTACT_FETCH_ERROR',
        message: 'Failed to fetch contacts',
        category: 'database'
      }
    });
  }
});

// Get contact by ID with details
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const context = extractContext(req);

    const result = await dualTerminologyService.getEntityById(id, context);

    if (!result.entity) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CONTACT_NOT_FOUND',
          message: 'Contact not found'
        }
      });
    }

    const response = {
      success: true,
      contact: {
        ...result.entity,
        communications: result.communications,
        conversations: result.conversations,
        campaigns: result.enrollments
      },
      terminology: result.terminology,
      timestamp: new Date().toISOString()
    };

    res.json(dualTerminologyService.getApiResponse(response, result.terminology));
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONTACT_FETCH_ERROR',
        message: 'Failed to fetch contact details',
        category: 'database'
      }
    });
  }
});

// Create contact
router.post('/', requireAuth, validateRequest({ body: createContactSchema }), async (req, res) => {
  try {
    const context = extractContext(req);
    const contactData = req.body;

    const result = await dualTerminologyService.createEntity(contactData, context);

    const response = {
      success: true,
      contact: result.entity,
      terminology: result.terminology,
      timestamp: new Date().toISOString()
    };

    res.status(201).json(dualTerminologyService.getApiResponse(response, result.terminology));
  } catch (error) {
    console.error('Error creating contact:', error);
    
    if (error instanceof Error && error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_CONTACT',
          message: error.message
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'CONTACT_CREATE_ERROR',
        message: 'Failed to create contact',
        category: 'database'
      }
    });
  }
});

// Update contact
router.put('/:id', requireAuth, validateRequest({ body: updateContactSchema }), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const context = extractContext(req);

    const result = await dualTerminologyService.updateEntity(id, updates, context);

    if (!result.entity) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CONTACT_NOT_FOUND',
          message: 'Contact not found'
        }
      });
    }

    const response = {
      success: true,
      contact: result.entity,
      terminology: result.terminology,
      timestamp: new Date().toISOString()
    };

    res.json(dualTerminologyService.getApiResponse(response, result.terminology));
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONTACT_UPDATE_ERROR',
        message: 'Failed to update contact',
        category: 'database'
      }
    });
  }
});

// Delete contact
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const context = extractContext(req);

    const result = await dualTerminologyService.deleteEntity(id, context);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CONTACT_NOT_FOUND',
          message: 'Contact not found'
        }
      });
    }

    const response = {
      success: true,
      message: 'Contact deleted successfully',
      terminology: result.terminology,
      timestamp: new Date().toISOString()
    };

    res.json(dualTerminologyService.getApiResponse(response, result.terminology));
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONTACT_DELETE_ERROR',
        message: 'Failed to delete contact',
        category: 'database'
      }
    });
  }
});

// Bulk import contacts
router.post('/import', requireAuth, async (req, res) => {
  try {
    const { contacts: contactData } = req.body;
    const context = extractContext(req);

    const result = await dualTerminologyService.importEntities(contactData, context);

    const response = {
      success: true,
      imported: result.imported,
      failed: result.failed,
      errors: result.errors,
      terminology: result.terminology,
      timestamp: new Date().toISOString()
    };

    res.json(dualTerminologyService.getApiResponse(response, result.terminology));
  } catch (error) {
    console.error('Error importing contacts:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONTACT_IMPORT_ERROR',  
        message: 'Failed to import contacts',
        category: 'database'
      }
    });
  }
});

// Update contact status
router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const context = extractContext(req);

    const validStatuses = ['new', 'contacted', 'qualified', 'converted', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Invalid contact status',
          validStatuses
        }
      });
    }

    const result = await dualTerminologyService.updateEntity(id, { status }, context);

    if (!result.entity) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CONTACT_NOT_FOUND',
          message: 'Contact not found'
        }
      });
    }

    const response = {
      success: true,
      contact: result.entity,
      terminology: result.terminology,
      timestamp: new Date().toISOString()
    };

    res.json(dualTerminologyService.getApiResponse(response, result.terminology));
  } catch (error) {
    console.error('Error updating contact status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONTACT_STATUS_UPDATE_ERROR',
        message: 'Failed to update contact status',
        category: 'database'
      }
    });
  }
});

// Terminology check endpoint - returns which terminology mode is active
router.get('/meta/terminology', requireAuth, async (req, res) => {
  try {
    const context = extractContext(req);
    const terminology = await dualTerminologyService.getTerminologyMode(context);
    const labels = dualTerminologyService.getTerminologyLabels(terminology);

    res.json({
      success: true,
      terminology: {
        mode: terminology,
        labels,
        flags: {
          contactsTerminology: await featureFlagService.isEnabled('ui.contacts-terminology', context)
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking terminology:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TERMINOLOGY_CHECK_ERROR',
        message: 'Failed to check terminology mode',
        category: 'system'
      }
    });
  }
});

export default router;