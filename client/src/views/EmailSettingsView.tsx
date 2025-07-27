import React from 'react';
import { EmailTestPanel } from '@/components/email/EmailTestPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Mail, 
  Settings, 
  TestTube,
  FileText,
  Bell
} from 'lucide-react';

export const EmailSettingsView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Email Settings</h1>
        <p className="text-gray-600 mt-2">Configure and test your email system</p>
      </div>

      <Tabs defaultValue="test" className="space-y-4">
        <TabsList>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Test Emails
          </TabsTrigger>
          <TabsTrigger value="configuration" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Webhooks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="test" className="space-y-4">
          <EmailTestPanel />
        </TabsContent>

        <TabsContent value="configuration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Service Configuration</CardTitle>
              <CardDescription>
                Configure your Mailgun settings for sending emails
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4 bg-gray-50">
                <h3 className="font-medium mb-2">Current Configuration</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service:</span>
                    <span className="font-medium">Mailgun</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Domain:</span>
                    <span className="font-medium">
                      {'Not configured'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">From Address:</span>
                    <span className="font-medium">
                      support@{'yourdomain.com'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-medium">Setup Instructions</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                  <li>Sign up for a Mailgun account at mailgun.com</li>
                  <li>Verify your domain in the Mailgun dashboard</li>
                  <li>Copy your API key from Mailgun settings</li>
                  <li>Add these environment variables to your .env file:
                    <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
{`MAILGUN_API_KEY=your-api-key-here
MAILGUN_DOMAIN=mail.yourdomain.com`}
                    </pre>
                  </li>
                  <li>Restart your server for changes to take effect</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>
                Manage your email templates for campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Email template management coming soon</p>
                <p className="text-sm mt-1">
                  You can currently create templates within campaigns
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Webhooks</CardTitle>
              <CardDescription>
                Configure webhooks to track email events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4">
                <h3 className="font-medium mb-2">Webhook URL</h3>
                <code className="block p-3 bg-gray-100 rounded text-sm break-all">
                  {window.location.origin}/api/email/webhooks/mailgun
                </code>
                <p className="text-sm text-gray-600 mt-2">
                  Add this URL to your Mailgun webhook settings to track:
                </p>
                <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                  <li>Email opens</li>
                  <li>Click tracking</li>
                  <li>Bounces and complaints</li>
                  <li>Unsubscribes</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="font-medium">Setup Instructions</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                  <li>Go to your Mailgun dashboard</li>
                  <li>Navigate to Sending → Webhooks</li>
                  <li>Click "Add webhook"</li>
                  <li>Select the events you want to track</li>
                  <li>Paste the webhook URL above</li>
                  <li>Save the webhook configuration</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmailSettingsView;