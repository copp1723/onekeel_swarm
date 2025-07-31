#!/bin/bash

# Fix React Import Issues
echo "==== Fixing React import issues ===="
node tools/build-fixes/fix-react-imports.js

# Fix specific CampaignWizardWrapper issue
echo "==== Fixing CampaignWizardWrapper issue ===="
node tools/build-fixes/fix-campaign-wizard-wrapper.js

# Run the build
echo "==== Running build ===="
npm run build

echo "==== Build process complete ===="
