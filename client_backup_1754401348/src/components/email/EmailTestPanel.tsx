import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Mail, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Settings,
  FileText,
  Zap
} from 'lucide-react';

type EmailType = 'simple' | 'template' | 'campaign';

interface EmailTestResult {
  success: boolean;
  data?: {
    result: {
      success: boolean;
      messageId?: string;
      error?: string;
    };
    type: string;
    to: string;
    timestamp: string;
    emailService: {
      configured: boolean;
      domain: string;
      apiKeyPresent: boolean;
    };
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export const EmailTestPanel: React.FC = () => {
  const [email, setEmail] = useState('');
  const [emailType, setEmailType] = useState<EmailType>('simple');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EmailTestResult | null>(null);

  const getEmailTypeIcon = (type: EmailType) => {
    switch (type) {
      case 'simple':
        return <Mail className="h-4 w-4" />;
      case 'template':
        return <FileText className="h-4 w-4" />;
      case 'campaign':
        return <Zap className="h-4 w-4" />;
    }
  };

  const getEmailTypeDescription = (type: EmailType) => {
    switch (type) {
      case 'simple':
        return 'Basic test email to verify configuration';
      case 'template':
        return 'Test email with variable replacement';
      case 'campaign':
        return 'Sample campaign-style email with CTA';
    }
  };

  const sendTestEmail = async () => {
    if (!email) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          to: email,
          type: emailType
        })
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Failed to send test email. Please check your connection.'
        }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Test Suite
          </CardTitle>
          <CardDescription>
            Send test emails to verify your email configuration and templates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Recipient Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="test@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                Enter the email address where you want to receive the test
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Email Type</Label>
              <Select
                value={emailType}
                onValueChange={(value: EmailType) => setEmailType(value)}
                disabled={loading}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Simple Test
                    </div>
                  </SelectItem>
                  <SelectItem value="template">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Template Test
                    </div>
                  </SelectItem>
                  <SelectItem value="campaign">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Campaign Test
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {getEmailTypeDescription(emailType)}
              </p>
            </div>

            <Button
              onClick={sendTestEmail}
              disabled={loading || !email}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Test Email
                </>
              )}
            </Button>
          </div>

          {/* Result Display */}
          {result && (
            <div className="mt-6">
              {result.success && result.data?.result.success ? (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Success!</AlertTitle>
                  <AlertDescription className="text-green-700">
                    Test email sent successfully to {result.data.to}
                    {result.data.result.messageId && (
                      <div className="mt-2 text-xs">
                        Message ID: {result.data.result.messageId}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertTitle className="text-red-800">Failed to Send</AlertTitle>
                  <AlertDescription className="text-red-700">
                    {result.error?.message || result.data?.result.error || 'Unknown error occurred'}
                    {result.error?.code === 'EMAIL_NOT_CONFIGURED' && (
                      <div className="mt-3 space-y-2">
                        <p className="font-medium">Configuration Status:</p>
                        <ul className="text-xs space-y-1">
                          <li>• Domain: {result.error.details?.domain || 'Not set'}</li>
                          <li>• API Key: {result.error.details?.apiKeyPresent ? 'Present' : 'Missing'}</li>
                          <li>• Status: {result.error.details?.configured ? 'Configured' : 'Not configured'}</li>
                        </ul>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" />
            Email Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium">Required Environment Variables:</p>
              <code className="block mt-1 p-2 bg-gray-100 rounded text-xs">
                MAILGUN_API_KEY=your-mailgun-api-key<br />
                MAILGUN_DOMAIN=mail.yourdomain.com
              </code>
            </div>
            <div>
              <p className="font-medium">Email Types:</p>
              <ul className="mt-1 space-y-1 text-gray-600">
                <li className="flex items-start gap-2">
                  {getEmailTypeIcon('simple')}
                  <span><strong>Simple:</strong> Basic test to verify email delivery</span>
                </li>
                <li className="flex items-start gap-2">
                  {getEmailTypeIcon('template')}
                  <span><strong>Template:</strong> Tests variable replacement (firstName, lastName, etc.)</span>
                </li>
                <li className="flex items-start gap-2">
                  {getEmailTypeIcon('campaign')}
                  <span><strong>Campaign:</strong> Sample marketing email with CTA button</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailTestPanel;