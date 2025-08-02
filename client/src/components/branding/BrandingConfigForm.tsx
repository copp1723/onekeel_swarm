import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Palette,
  Globe,
  Mail,
  Image,
  Save,
  X,
  Eye,
  AlertCircle,
  Building,
} from 'lucide-react';

// Assuming this exists in the shared directory, if not you'll need to create it
interface CCLBrandingConfig {
  companyName: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  emailFromName: string;
  supportEmail: string;
  websiteUrl?: string;
  favicon?: string;
  customCss?: string;
}

// If this constant doesn't exist in the shared config, define it here
const DEFAULT_BRANDING: CCLBrandingConfig = {
  companyName: '',
  logoUrl: '',
  primaryColor: '#2563eb',
  secondaryColor: '#1d4ed8',
  emailFromName: '',
  supportEmail: '',
  websiteUrl: '',
  favicon: '',
  customCss: '',
};

interface BrandingConfigFormProps {
  initialData?: {
    id?: string;
    name?: string;
    domain?: string;
    branding: CCLBrandingConfig;
    isStatic?: boolean;
  };
  onSave: (data: {
    name: string;
    domain?: string;
    branding: CCLBrandingConfig;
  }) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
}

export function BrandingConfigForm({
  initialData,
  onSave,
  onCancel,
  isEditing = false,
}: BrandingConfigFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    domain: initialData?.domain || '',
    branding: initialData?.branding || { ...DEFAULT_BRANDING },
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        domain: initialData.domain || '',
        branding: { ...initialData.branding },
      });
    }
  }, [initialData]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Client name is required';
    }

    if (!formData.branding.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }

    if (!formData.branding.primaryColor.match(/^#[0-9A-Fa-f]{6}$/)) {
      newErrors.primaryColor = 'Primary color must be a valid hex color';
    }

    if (!formData.branding.secondaryColor.match(/^#[0-9A-Fa-f]{6}$/)) {
      newErrors.secondaryColor = 'Secondary color must be a valid hex color';
    }

    if (!formData.branding.emailFromName.trim()) {
      newErrors.emailFromName = 'Email from name is required';
    }

    if (!formData.branding.supportEmail.trim()) {
      newErrors.supportEmail = 'Support email is required';
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.branding.supportEmail)
    ) {
      newErrors.supportEmail = 'Support email must be a valid email address';
    }

    if (
      formData.branding.logoUrl &&
      !formData.branding.logoUrl.match(/^https?:\/\/.+/)
    ) {
      newErrors.logoUrl = 'Logo URL must be a valid URL';
    }

    if (
      formData.branding.websiteUrl &&
      !formData.branding.websiteUrl.match(/^https?:\/\/.+/)
    ) {
      newErrors.websiteUrl = 'Website URL must be a valid URL';
    }

    if (
      formData.branding.favicon &&
      !formData.branding.favicon.match(/^https?:\/\/.+/)
    ) {
      newErrors.favicon = 'Favicon URL must be a valid URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        name: formData.name,
        domain: formData.domain || undefined,
        branding: formData.branding,
      });
    } catch (error) {
      console.error('Failed to save branding:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateBranding = (field: keyof CCLBrandingConfig, value: string) => {
    setFormData(prev => ({
      ...prev,
      branding: {
        ...prev.branding,
        [field]: value,
      },
    }));
  };

  return (
    <div className='space-y-6'>
      <form onSubmit={handleSubmit} className='space-y-6'>
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center space-x-2'>
              <Building className='h-5 w-5' />
              <span>{isEditing ? 'Edit' : 'Create'} Client Branding</span>
            </CardTitle>
            <CardDescription>
              Configure branding settings for a client or domain
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {initialData?.isStatic && (
              <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-3'>
                <div className='flex items-center space-x-2'>
                  <AlertCircle className='h-4 w-4 text-yellow-600' />
                  <span className='text-sm text-yellow-800'>
                    This is a static branding configuration and cannot be
                    edited.
                  </span>
                </div>
              </div>
            )}

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='name'>Client Name *</Label>
                <Input
                  id='name'
                  value={formData.name}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, name: e.target.value }))
                  }
                  placeholder='e.g., Demo Lead Solutions'
                  className={errors.name ? 'border-red-500' : ''}
                  disabled={initialData?.isStatic}
                />
                {errors.name && (
                  <p className='text-sm text-red-600'>{errors.name}</p>
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='domain'>Domain</Label>
                <Input
                  id='domain'
                  value={formData.domain}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, domain: e.target.value }))
                  }
                  placeholder='e.g., demo.localhost'
                  disabled={initialData?.isStatic}
                />
                <p className='text-xs text-gray-500'>
                  Optional: Domain for automatic branding detection
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Company Branding */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center space-x-2'>
              <Palette className='h-5 w-5' />
              <span>Company Branding</span>
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='companyName'>Company Name *</Label>
                <Input
                  id='companyName'
                  value={formData.branding.companyName}
                  onChange={e => updateBranding('companyName', e.target.value)}
                  placeholder='e.g., Demo Lead Solutions'
                  className={errors.companyName ? 'border-red-500' : ''}
                  disabled={initialData?.isStatic}
                />
                {errors.companyName && (
                  <p className='text-sm text-red-600'>{errors.companyName}</p>
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='logoUrl'>Logo URL</Label>
                <Input
                  id='logoUrl'
                  value={formData.branding.logoUrl || ''}
                  onChange={e => updateBranding('logoUrl', e.target.value)}
                  placeholder='https://example.com/logo.png'
                  className={errors.logoUrl ? 'border-red-500' : ''}
                  disabled={initialData?.isStatic}
                />
                {errors.logoUrl && (
                  <p className='text-sm text-red-600'>{errors.logoUrl}</p>
                )}
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='primaryColor'>Primary Color *</Label>
                <div className='flex space-x-2'>
                  <Input
                    id='primaryColor'
                    type='color'
                    value={formData.branding.primaryColor}
                    onChange={e =>
                      updateBranding('primaryColor', e.target.value)
                    }
                    className='w-16 h-10 p-1 border rounded'
                    disabled={initialData?.isStatic}
                  />
                  <Input
                    value={formData.branding.primaryColor}
                    onChange={e =>
                      updateBranding('primaryColor', e.target.value)
                    }
                    placeholder='#2563eb'
                    className={`flex-1 ${errors.primaryColor ? 'border-red-500' : ''}`}
                    disabled={initialData?.isStatic}
                  />
                </div>
                {errors.primaryColor && (
                  <p className='text-sm text-red-600'>{errors.primaryColor}</p>
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='secondaryColor'>Secondary Color *</Label>
                <div className='flex space-x-2'>
                  <Input
                    id='secondaryColor'
                    type='color'
                    value={formData.branding.secondaryColor}
                    onChange={e =>
                      updateBranding('secondaryColor', e.target.value)
                    }
                    className='w-16 h-10 p-1 border rounded'
                    disabled={initialData?.isStatic}
                  />
                  <Input
                    value={formData.branding.secondaryColor}
                    onChange={e =>
                      updateBranding('secondaryColor', e.target.value)
                    }
                    placeholder='#1d4ed8'
                    className={`flex-1 ${errors.secondaryColor ? 'border-red-500' : ''}`}
                    disabled={initialData?.isStatic}
                  />
                </div>
                {errors.secondaryColor && (
                  <p className='text-sm text-red-600'>
                    {errors.secondaryColor}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email Settings */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center space-x-2'>
              <Mail className='h-5 w-5' />
              <span>Email Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='emailFromName'>Email From Name *</Label>
                <Input
                  id='emailFromName'
                  value={formData.branding.emailFromName}
                  onChange={e =>
                    updateBranding('emailFromName', e.target.value)
                  }
                  placeholder='e.g., Demo Lead Solutions'
                  className={errors.emailFromName ? 'border-red-500' : ''}
                  disabled={initialData?.isStatic}
                />
                {errors.emailFromName && (
                  <p className='text-sm text-red-600'>{errors.emailFromName}</p>
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='supportEmail'>Support Email *</Label>
                <Input
                  id='supportEmail'
                  type='email'
                  value={formData.branding.supportEmail}
                  onChange={e => updateBranding('supportEmail', e.target.value)}
                  placeholder='support@example.com'
                  className={errors.supportEmail ? 'border-red-500' : ''}
                  disabled={initialData?.isStatic}
                />
                {errors.supportEmail && (
                  <p className='text-sm text-red-600'>{errors.supportEmail}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Settings */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center space-x-2'>
              <Globe className='h-5 w-5' />
              <span>Additional Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='websiteUrl'>Website URL</Label>
                <Input
                  id='websiteUrl'
                  value={formData.branding.websiteUrl || ''}
                  onChange={e => updateBranding('websiteUrl', e.target.value)}
                  placeholder='https://example.com'
                  className={errors.websiteUrl ? 'border-red-500' : ''}
                  disabled={initialData?.isStatic}
                />
                {errors.websiteUrl && (
                  <p className='text-sm text-red-600'>{errors.websiteUrl}</p>
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='favicon'>Favicon URL</Label>
                <Input
                  id='favicon'
                  value={formData.branding.favicon || ''}
                  onChange={e => updateBranding('favicon', e.target.value)}
                  placeholder='https://example.com/favicon.ico'
                  className={errors.favicon ? 'border-red-500' : ''}
                  disabled={initialData?.isStatic}
                />
                {errors.favicon && (
                  <p className='text-sm text-red-600'>{errors.favicon}</p>
                )}
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='customCss'>Custom CSS</Label>
              <Textarea
                id='customCss'
                value={formData.branding.customCss || ''}
                onChange={e => updateBranding('customCss', e.target.value)}
                placeholder='/* Custom CSS styles */'
                rows={4}
                disabled={initialData?.isStatic}
              />
              <p className='text-xs text-gray-500'>
                Optional: Custom CSS to inject into the application
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className='flex justify-between items-center'>
          <Button
            type='button'
            variant='outline'
            onClick={() => setShowPreview(!showPreview)}
            className='flex items-center space-x-2'
          >
            <Eye className='h-4 w-4' />
            <span>{showPreview ? 'Hide' : 'Show'} Preview</span>
          </Button>

          <div className='flex space-x-2'>
            <Button type='button' variant='outline' onClick={onCancel}>
              <X className='h-4 w-4 mr-2' />
              Cancel
            </Button>
            {!initialData?.isStatic && (
              <Button type='submit' disabled={isSubmitting}>
                <Save className='h-4 w-4 mr-2' />
                {isSubmitting ? 'Saving...' : 'Save Branding'}
              </Button>
            )}
          </div>
        </div>
      </form>

      {/* Preview Section */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              Preview how the branding will look in the application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className='border rounded-lg p-4'
              style={{
                backgroundColor: '#ffffff',
                borderColor: formData.branding.primaryColor,
              }}
            >
              <div className='flex items-center space-x-3 mb-4'>
                {formData.branding.logoUrl && (
                  <img
                    src={formData.branding.logoUrl}
                    alt='Logo'
                    className='h-8 w-8 object-contain'
                    onError={e => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <h1
                  className='text-2xl font-bold'
                  style={{ color: formData.branding.primaryColor }}
                >
                  {formData.branding.companyName}
                </h1>
              </div>

              <div className='space-y-2'>
                <Badge
                  style={{
                    backgroundColor: formData.branding.primaryColor,
                    color: 'white',
                  }}
                >
                  Primary Color
                </Badge>
                <Badge
                  style={{
                    backgroundColor: formData.branding.secondaryColor,
                    color: 'white',
                  }}
                >
                  Secondary Color
                </Badge>
              </div>

              <div className='mt-4 text-sm text-gray-600'>
                <p>
                  <strong>Email From:</strong> {formData.branding.emailFromName}
                </p>
                <p>
                  <strong>Support:</strong> {formData.branding.supportEmail}
                </p>
                {formData.branding.websiteUrl && (
                  <p>
                    <strong>Website:</strong> {formData.branding.websiteUrl}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
