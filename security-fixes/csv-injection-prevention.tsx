// CSV Injection Prevention for CampaignWizard.tsx

import Papa from 'papaparse';

// Dangerous CSV formula prefixes that could execute in spreadsheet apps
const DANGEROUS_PREFIXES = ['=', '+', '-', '@', '\t=', '\t+', '\t-', '\t@', ' =', ' +', ' -', ' @'];

// Sanitize a single CSV cell value
function sanitizeCSVCell(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value).trim();
  
  // Check for dangerous formula prefixes
  for (const prefix of DANGEROUS_PREFIXES) {
    if (stringValue.startsWith(prefix)) {
      // Prefix with single quote to prevent formula execution
      return `'${stringValue}`;
    }
  }
  
  // Also check for other dangerous patterns
  if (stringValue.match(/^[\s\t]*=/)) {
    return `'${stringValue}`;
  }
  
  // Escape any pipe characters that might be interpreted as cell separators
  return stringValue.replace(/\|/g, '\\|');
}

// Validate email addresses to prevent injection
function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 254;
}

// Updated onDrop callback with security measures
const onDrop = useCallback((acceptedFiles: File[]) => {
  setCsvError('');
  
  if (acceptedFiles.length === 0) {
    return;
  }
  
  const file = acceptedFiles[0];
  
  // 1. File size validation (10MB limit)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    setCsvError('File size exceeds 10MB limit');
    return;
  }
  
  // 2. File type validation
  const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/csv'];
  if (!validTypes.includes(file.type) && !file.name.endsWith('.csv')) {
    setCsvError('Invalid file type. Please upload a CSV file.');
    return;
  }
  
  setUploadedFileName(file.name);
  
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => {
      // Sanitize header names
      return sanitizeCSVCell(header).replace(/[^\w\s-]/g, '').trim();
    },
    transform: (value) => {
      // Sanitize all cell values
      return sanitizeCSVCell(value);
    },
    complete: (results: Papa.ParseResult<any>) => {
      if (results.errors.length > 0) {
        setCsvError(`CSV parsing error: ${results.errors[0].message}`);
        return;
      }
      
      if (!results.data || results.data.length === 0) {
        setCsvError('CSV file is empty');
        return;
      }
      
      // 3. Row limit (prevent DoS)
      const maxRows = 10000;
      if (results.data.length > maxRows) {
        setCsvError(`CSV file exceeds ${maxRows} row limit`);
        return;
      }
      
      // Process and validate contacts
      const validContacts = results.data
        .map((row: any) => {
          const contact: any = {};
          
          // Sanitize and validate each field
          Object.keys(row).forEach(key => {
            const value = row[key];
            
            // Special validation for email fields
            if (key.toLowerCase().includes('email')) {
              if (isValidEmail(value)) {
                contact[key] = value.toLowerCase();
              } else {
                contact[key] = ''; // Invalid email
              }
            } else {
              contact[key] = sanitizeCSVCell(value);
            }
          });
          
          return contact;
        })
        .filter((contact: any) => {
          // Must have valid email
          const emailField = headerMapping['email'];
          return emailField && isValidEmail(contact[emailField]);
        });
      
      if (validContacts.length === 0) {
        setCsvError('No valid contacts found in CSV. Please ensure email addresses are valid.');
        return;
      }
      
      // Log security audit
      console.log('CSV upload security audit:', {
        fileName: file.name,
        originalRows: results.data.length,
        validRows: validContacts.length,
        invalidRows: results.data.length - validContacts.length
      });
      
      // Update campaign data with sanitized contacts
      setCampaignData(prev => ({
        ...prev,
        audience: {
          ...prev.audience,
          contacts: validContacts,
          headerMapping: headerMapping,
          targetCount: validContacts.length
        }
      }));
    },
    error: (error: Error) => {
      setCsvError(`Error reading file: ${error.message}`);
    }
  });
}, [setCampaignData, setCsvError, setUploadedFileName]);

// Add content security headers for CSV downloads
export function generateSecureCSVResponse(data: any[], filename: string): Response {
  const csvContent = Papa.unparse(data, {
    header: true,
    quotes: true // Always quote fields to prevent injection
  });
  
  return new Response(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename.replace(/"/g, '')}"`,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
      'X-Frame-Options': 'DENY'
    }
  });
}