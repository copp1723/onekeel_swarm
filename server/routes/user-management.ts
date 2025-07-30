import { Router } from 'express';
import { usersRepository as UsersRepository } from '../db';
import { authenticate, authorize } from '../middleware/auth';
import { z } from 'zod';
import { validate, validateQuery } from '../middleware/validation';
import { auditCreate, auditUpdate, auditDelete } from '../middleware/audit';

const router = Router();

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string().min(8),
  role: z.enum(['admin', 'manager', 'agent', 'viewer']),
  active: z.boolean().optional().default(true),
  metadata: z.record(z.any()).optional()
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(['admin', 'manager', 'agent', 'viewer']).optional(),
  active: z.boolean().optional(),
  metadata: z.record(z.any()).optional()
});

const userQuerySchema = z.object({
  role: z.enum(['admin', 'manager', 'agent', 'viewer']).optional(),
  active: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  search: z.string().optional()
});

// Create user (admin only)
router.post('/api/admin/users/create',
  authenticate,
  authorize('admin'),
  validate(createUserSchema),
  auditCreate('user'),
  async (req, res) => {
    try {
      // Check if email already exists
      const existingUser = await UsersRepository.findByEmail(req.body.email);
      
      if (existingUser) {
        return res.status(409).json({ 
          error: 'Email already in use',
          code: 'EMAIL_EXISTS'
        });
      }
      
      const user = await UsersRepository.create({
        ...req.body,
        createdBy: req.user!.id
      });
      
      res.status(201).json({ 
        success: true, 
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          active: user.active,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
);

// Get all users (admin only)
router.get('/api/admin/users',
  authenticate,
  authorize('admin'),
  validateQuery(userQuerySchema),
  async (req, res) => {
    try {
      const { role, active, search } = req.query;
      
      const users = await UsersRepository.findAll({
        role: role as string,
        active: active as boolean,
        search: search as string
      });
      
      res.json({ users });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }
);

// Update user (admin only)
router.put('/api/admin/users/:id',
  authenticate,
  authorize('admin'),
  validate(updateUserSchema),
  auditUpdate('user'),
  async (req, res) => {
    try {
      const user = await UsersRepository.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Prevent updating the last admin if disabling
      if (user.role === 'admin' && req.body.active === false) {
        const adminCount = await UsersRepository.countByRole('admin');
        
        if (adminCount <= 1) {
          return res.status(400).json({ 
            error: 'Cannot deactivate the last admin user',
            code: 'LAST_ADMIN'
          });
        }
      }
      
      const updatedUser = await UsersRepository.update(req.params.id, req.body);
      
      res.json({ 
        success: true, 
        user: updatedUser 
      });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
);

// Delete user (admin only)
router.delete('/api/admin/users/:id',
  authenticate,
  authorize('admin'),
  auditDelete('user'),
  async (req, res) => {
    try {
      const user = await UsersRepository.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Prevent deleting the last admin
      if (user.role === 'admin') {
        const adminCount = await UsersRepository.countByRole('admin');
        
        if (adminCount <= 1) {
          return res.status(400).json({ 
            error: 'Cannot delete the last admin user',
            code: 'LAST_ADMIN'
          });
        }
      }
      
      // Prevent self-deletion
      if (user.id === req.user!.id) {
        return res.status(400).json({ 
          error: 'Cannot delete your own account',
          code: 'SELF_DELETE'
        });
      }
      
      await UsersRepository.delete(req.params.id);
      
      res.json({ 
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  }
);

// Toggle user active status (admin only)
router.post('/api/admin/users/:id/toggle',
  authenticate,
  authorize('admin'),
  auditUpdate('user'),
  async (req, res) => {
    try {
      const user = await UsersRepository.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Prevent deactivating the last admin
      if (user.role === 'admin' && user.active) {
        const adminCount = await UsersRepository.countByRole('admin');
        
        if (adminCount <= 1) {
          return res.status(400).json({ 
            error: 'Cannot deactivate the last admin user',
            code: 'LAST_ADMIN'
          });
        }
      }
      
      // Prevent self-deactivation
      if (user.id === req.user!.id) {
        return res.status(400).json({ 
          error: 'Cannot deactivate your own account',
          code: 'SELF_DEACTIVATE'
        });
      }
      
      const updatedUser = await UsersRepository.toggleActive(req.params.id);
      
      res.json({ 
        success: true, 
        user: updatedUser,
        message: `User ${updatedUser.active ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      console.error('Error toggling user status:', error);
      res.status(500).json({ error: 'Failed to toggle user status' });
    }
  }
);

export default router;