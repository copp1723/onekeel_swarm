import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const ClientSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  industry: z.string().optional(),
  domain: z.string().optional(),
  settings: z.object({
    branding: z.any().optional()
  }).optional(),
  brand_config: z.any().optional(),
});

const ClientUpdateSchema = ClientSchema.partial();

// Mock clients data
const mockClients = [
  {
    id: 'client-1',
    name: 'Acme Corporation',
    industry: 'Technology',
    domain: 'acme.com',
    settings: {
      branding: {
        primaryColor: '#007bff',
        logo: 'https://example.com/logo.png'
      }
    },
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'client-2',
    name: 'Beta Industries',
    industry: 'Manufacturing',
    domain: 'beta.com',
    settings: {
      branding: {
        primaryColor: '#28a745',
        logo: 'https://example.com/beta-logo.png'
      }
    },
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Get all clients
router.get('/', async (req, res) => {
  try {
    res.json({ 
      success: true, 
      data: mockClients 
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.json({ 
      success: true, 
      data: [] 
    });
  }
});

// Get a single client
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = mockClients.find(c => c.id === id);
    
    if (client) {
      res.json({ 
        success: true, 
        data: client 
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: 'Client not found' 
      });
    }
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal Server Error' 
    });
  }
});

// Create a new client
router.post('/', async (req, res) => {
  try {
    const validationResult = ClientSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid client data', 
        errors: validationResult.error.errors 
      });
    }

    const newClientData = validationResult.data;
    const newClient = {
      id: `client-${Date.now()}`,
      name: newClientData.name,
      industry: newClientData.industry,
      domain: newClientData.domain,
      settings: newClientData.settings || { branding: newClientData.brand_config || {} },
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    mockClients.push(newClient);
    
    res.status(201).json({ 
      success: true, 
      data: newClient 
    });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal Server Error' 
    });
  }
});

// Update a client
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validationResult = ClientUpdateSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid update data', 
        errors: validationResult.error.errors 
      });
    }

    const updates = validationResult.data;
    const clientIndex = mockClients.findIndex(c => c.id === id);
    
    if (clientIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        message: 'Client not found' 
      });
    }

    const updatedClient = {
      ...mockClients[clientIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    mockClients[clientIndex] = updatedClient;
    
    res.json({ 
      success: true, 
      data: updatedClient 
    });
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal Server Error' 
    });
  }
});

// Delete a client
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const clientIndex = mockClients.findIndex(c => c.id === id);
    
    if (clientIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        message: 'Client not found' 
      });
    }

    mockClients.splice(clientIndex, 1);
    
    res.json({ 
      success: true, 
      message: 'Client deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal Server Error' 
    });
  }
});

export default router;