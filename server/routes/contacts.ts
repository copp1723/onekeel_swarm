import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation';
import { requireAuth } from '../middleware/auth';
import { LeadsRepository } from '../db/index';
import { OptimizedRepositoryService } from '../services/optimized-repository-service';
// Simplified - removed complex terminology and feature flag services per handoff

const router = Router();

// Simplified - no complex context needed

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

    // Simplified - direct repository call without complex terminology
    const result = await OptimizedRepositoryService.getLeadsPaginated({
      page: Math.floor(Number(offset) / Number(limit)) + 1,
      limit: Number(limit),
      status: status as string,
      source: source as string,
      search: search as string,
      sortBy: sort as string,
      sortOrder: order as 'asc' | 'desc'
    });

    const response = {
      success: true,
      contacts: result.data.map(item => item.lead), // Using "contacts" terminology for API consistency
      total: result.pagination.total,
      offset: Number(offset),
      limit: Number(limit),
      timestamp: new Date().toISOString()
    };

    res.json(response);
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

    // Simplified - direct repository call
    const lead = await LeadsRepository.findById(id);

    if (!lead) {
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
      contact: lead, // Using "contact" terminology for API consistency
      timestamp: new Date().toISOString()
    };

    res.json(response);
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
    const contactData = req.body;

    // Simplified - direct repository call
    const lead = await LeadsRepository.create(contactData);

    const response = {
      success: true,
      contact: lead, // Using "contact" terminology for API consistency
      timestamp: new Date().toISOString()
    };

    res.status(201).json(response);
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

    // Simplified - direct repository call
    const lead = await LeadsRepository.update(id, updates);

    if (!lead) {
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
      contact: lead, // Using "contact" terminology for API consistency
      timestamp: new Date().toISOString()
    };

    res.json(response);
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

    // Simplified - direct repository call
    const success = await LeadsRepository.delete(id);

    if (!success) {
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
      timestamp: new Date().toISOString()
    };

    res.json(response);
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

// Bulk import contacts - simplified implementation
router.post('/import', requireAuth, async (req, res) => {
  try {
    const { contacts: contactData } = req.body;

    // Simplified - create contacts one by one (can be optimized later)
    const imported = [];
    const failed = [];

    for (const contact of contactData) {
      try {
        const lead = await LeadsRepository.create(contact);
        imported.push(lead);
      } catch (error) {
        failed.push({ contact, error: (error as Error).message });
      }
    }

    const response = {
      success: true,
      imported: imported.length,
      failed: failed.length,
      errors: failed,
      timestamp: new Date().toISOString()
    };

    res.json(response);
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

    // Simplified - direct repository call
    const lead = await LeadsRepository.update(id, { status });

    if (!lead) {
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
      contact: lead, // Using "contact" terminology for API consistency
      timestamp: new Date().toISOString()
    };

    res.json(response);
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

// Terminology endpoint removed as part of simplification

export default router;