import { Router, Request, Response } from 'express';
import { featureFlagService } from '../services/feature-flag-service';

const router = Router();

// Extract feature flag context from request
const extractContext = (req: any) => ({
  userId: req.user?.id,
  userRole: req.user?.role,
  environment: process.env.NODE_ENV as any || 'development'
});

// Navigation structure mapping based on feature flags
const getNavigationStructure = async (context: any) => {
  const useNewNavigation = await featureFlagService.isEnabled('ui.new-navigation', context);
  const useContactsTerminology = await featureFlagService.isEnabled('ui.contacts-terminology', context);
  
  if (useNewNavigation) {
    // New 3-tab structure
    return {
      structure: '3-tab',
      tabs: [
        {
          id: 'people',
          name: useContactsTerminology ? 'Contacts' : 'Leads',
          path: useContactsTerminology ? '/contacts' : '/leads',
          legacy_path: '/leads',
          modern_path: '/contacts'
        },
        {
          id: 'campaigns',
          name: 'Campaigns',
          path: '/campaigns',
          legacy_path: '/campaigns',
          modern_path: '/campaigns'
        },
        {
          id: 'settings',
          name: 'Settings',
          path: '/settings',
          legacy_path: '/settings',
          modern_path: '/settings',
          children: [
            { name: 'Agents', path: '/settings/agents' },
            { name: 'Templates', path: '/settings/templates' },
            { name: 'Users', path: '/settings/users' },
            { name: 'Feature Flags', path: '/settings/feature-flags', adminOnly: true }
          ]
        }
      ]
    };
  } else {
    // Legacy multi-tab structure
    return {
      structure: 'legacy',
      tabs: [
        {
          id: 'dashboard',
          name: 'Dashboard',
          path: '/dashboard'
        },
        {
          id: 'leads',
          name: useContactsTerminology ? 'Contacts' : 'Leads',
          path: useContactsTerminology ? '/contacts' : '/leads'
        },
        {
          id: 'campaigns',
          name: 'Campaigns',
          path: '/campaigns'
        },
        {
          id: 'agents',
          name: 'Agents',
          path: '/agents'
        },
        {
          id: 'conversations',
          name: 'Conversations',
          path: '/conversations'
        },
        {
          id: 'settings',
          name: 'Settings',
          path: '/settings'
        }
      ]
    };
  }
};

// Get navigation configuration
router.get('/config', async (req: Request, res: Response) => {
  try {
    const context = extractContext(req);
    const navigation = await getNavigationStructure(context);
    
    res.json({
      success: true,
      navigation,
      flags: {
        newNavigation: await featureFlagService.isEnabled('ui.new-navigation', context),
        contactsTerminology: await featureFlagService.isEnabled('ui.contacts-terminology', context)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting navigation config:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'NAVIGATION_CONFIG_ERROR',
        message: 'Failed to get navigation configuration'
      }
    });
  }
});

// Route aliases for backward compatibility
router.get('/route-aliases', async (req: Request, res: Response) => {
  try {
    const context = extractContext(req);
    const useContactsTerminology = await featureFlagService.isEnabled('ui.contacts-terminology', context);
    
    const aliases = {
      // API route aliases
      api: {
        ...(useContactsTerminology && {
          '/api/leads': '/api/contacts',
          '/api/leads/*': '/api/contacts/*'
        })
      },
      
      // Frontend route aliases
      frontend: {
        ...(useContactsTerminology && {
          '/leads': '/contacts',
          '/leads/*': '/contacts/*'
        })
      },
      
      // Terminology mappings
      terminology: {
        mode: useContactsTerminology ? 'modern' : 'legacy',
        labels: {
          singular: useContactsTerminology ? 'contact' : 'lead',
          plural: useContactsTerminology ? 'contacts' : 'leads',
          singularCapitalized: useContactsTerminology ? 'Contact' : 'Lead',
          pluralCapitalized: useContactsTerminology ? 'Contacts' : 'Leads'
        }
      }
    };
    
    res.json({
      success: true,
      aliases,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting route aliases:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ROUTE_ALIASES_ERROR',
        message: 'Failed to get route aliases'
      }
    });
  }
});

// Navigation breadcrumbs helper
router.get('/breadcrumbs', async (req: Request, res: Response) => {
  try {
    const { path } = req.query;
    const context = extractContext(req);
    const navigation = await getNavigationStructure(context);
    
    if (!path || typeof path !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PATH',
          message: 'Path parameter is required'
        }
      });
    }
    
    // Generate breadcrumbs based on current path and navigation structure
    const breadcrumbs = [];
    const pathSegments = path.split('/').filter(Boolean);
    
    // Add root
    breadcrumbs.push({
      name: 'Home',
      path: '/',
      active: pathSegments.length === 0
    });
    
    // Find matching tab and build breadcrumbs
    for (const tab of navigation.tabs) {
      const tabPath = tab.path.replace('/', '');
      if (pathSegments.includes(tabPath) || (pathSegments[0] && tab.legacy_path?.includes(pathSegments[0]))) {
        breadcrumbs.push({
          name: tab.name,
          path: tab.path,
          active: pathSegments.length === 1 && pathSegments[0] === tabPath
        });
        
        // Handle sub-paths
        if (tab.children && pathSegments.length > 1) {
          for (const child of tab.children) {
            const childPath = child.path.split('/').pop();
            if (pathSegments.includes(childPath!)) {
              breadcrumbs.push({
                name: child.name,
                path: child.path,
                active: true
              });
            }
          }
        }
        break;
      }
    }
    
    res.json({
      success: true,
      breadcrumbs,
      currentPath: path,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating breadcrumbs:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'BREADCRUMBS_ERROR',
        message: 'Failed to generate breadcrumbs'
      }
    });
  }
});

export default router;