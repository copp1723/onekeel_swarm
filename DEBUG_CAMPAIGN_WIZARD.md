# Campaign Wizard Debug Guide

## Issue Summary
- Campaign wizard shows blank/white screen when clicking "Next"
- "Create Smart Campaign" button was redirecting to homepage (FIXED)

## Current Status
✅ **FIXED**: "Create Smart Campaign" button now navigates to campaigns view  
🔧 **IN PROGRESS**: Campaign wizard blank screen issue

## Debugging Steps for Campaign Wizard

### 1. Check Browser Console
When the wizard goes blank, open browser developer tools (F12) and check for:
- JavaScript errors
- Missing resource errors
- React component errors

### 2. Verify Component State
Using React DevTools:
1. Find the `CampaignWizard` component
2. Check that `currentStep` is updating when clicking "Next"
3. Verify `isOpen` prop is `true`

### 3. Test Individual Steps
The wizard has these steps:
- `basics` - Campaign name/description
- `audience` - CSV upload for contacts
- `agent` - Agent selection
- `offer` - Offer details
- `templates` - Email templates
- `schedule` - Campaign scheduling
- `review` - Final review

### 4. Common Causes
Likely causes for blank screen:
1. **Missing UI Components**: Check if all `@/components/ui/*` imports work
2. **CSS Issues**: Missing styles causing invisible content
3. **State Corruption**: Parent component state issues
4. **JavaScript Errors**: Runtime errors breaking rendering

### 5. Quick Test
Try this in browser console when wizard is open:
```javascript
// Check if wizard state is updating
const wizardComponent = document.querySelector('[data-testid="campaign-wizard"]');
console.log('Wizard element:', wizardComponent);

// Check React component state (requires React DevTools)
$r.state // or $r.props if it's a function component
```

### 6. Temporary Workaround
If wizard is broken, users can still create campaigns via:
1. **Campaigns Tab** → **Classic Editor** button
2. The classic campaign editor should work independently

## Files Involved
- `/client/src/components/campaign-wizard/CampaignWizard.tsx` - Main wizard component
- `/client/src/views/CampaignsView.tsx` - Contains wizard integration
- `/client/src/components/ui/*` - UI component dependencies

## Next Steps
1. Deploy current fixes
2. Test "Create Smart Campaign" button (should work now)
3. Test campaign wizard step progression
4. Investigate blank screen issue with browser console
5. Implement workaround if needed