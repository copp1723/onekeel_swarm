import { Router } from 'express';
import { z } from 'zod';
import * as csv from 'csv-parse';
import { db } from '../db/client';
import { leads } from '../db/schema';
import { eq } from 'drizzle-orm';
import { validateRequest } from '../middleware/validation';
import multer from 'multer';
import { logger } from '../utils/logger';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Field mapping suggestions based on common CSV headers
const fieldMappingSuggestions: Record<string, string> = {
  'first name': 'firstName',
  'firstname': 'firstName',
  'first_name': 'firstName',
  'fname': 'firstName',
  'last name': 'lastName',
  'lastname': 'lastName',
  'last_name': 'lastName',
  'lname': 'lastName',
  'email': 'email',
  'email address': 'email',
  'email_address': 'email',
  'phone': 'phone',
  'phone number': 'phone',
  'phone_number': 'phone',
  'mobile': 'phone',
  'source': 'source',
  'lead source': 'source',
  'lead_source': 'source',
  'company': 'employer',
  'employer': 'employer',
  'job title': 'jobTitle',
  'job_title': 'jobTitle',
  'position': 'jobTitle',
  'income': 'income',
  'annual income': 'income',
  'annual_income': 'income',
  'credit score': 'creditScore',
  'credit_score': 'creditScore',
  'notes': 'notes',
  'comments': 'notes'
};

// Analyze CSV file and suggest field mappings
router.post('/analyze', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'No file uploaded'
        }
      });
    }

    const fileContent = req.file.buffer.toString('utf-8');
    const rows: any[] = [];
    let headers: string[] = [];

    // Parse CSV to get headers and preview rows
    const parser = csv.parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      cast: false,
      max_record_size: 50000
    });

    parser.on('readable', function() {
      let record;
      while ((record = parser.read()) !== null) {
        if (rows.length === 0 && Object.keys(record).length > 0) {
          headers = Object.keys(record);
        }
        if (rows.length < 5) { // Get first 5 rows for preview
          rows.push(record);
        }
      }
    });

    parser.on('error', function(err) {
      logger.error('CSV parsing error:', err);
      res.status(400).json({
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'Failed to parse CSV file',
          details: err.message
        }
      });
    });

    parser.write(fileContent);
    parser.end();

    await new Promise((resolve) => parser.on('end', resolve));

    // Count total rows
    const allRows = fileContent.split('\n').filter(line => line.trim()).length - 1;

    // Generate field mapping suggestions
    const suggestedMappings = headers.map(header => {
      const normalizedHeader = header.toLowerCase().trim();
      const leadField = fieldMappingSuggestions[normalizedHeader] || '';
      
      return {
        csvColumn: header,
        leadField: leadField
      };
    });

    res.json({
      headers,
      previewRows: rows,
      suggestedMappings,
      totalRows: allRows
    });

  } catch (error) {
    logger.error('Error analyzing CSV:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYSIS_ERROR',
        message: 'Failed to analyze CSV file',
        category: 'processing'
      }
    });
  }
});

// Import leads from CSV
router.post('/leads', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'No file uploaded'
        }
      });
    }

    const mappings = JSON.parse(req.body.mappings || '[]');
    const campaignId = req.body.campaignId;

    if (!Array.isArray(mappings) || mappings.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_MAPPINGS',
          message: 'Field mappings are required'
        }
      });
    }

    const fileContent = req.file.buffer.toString('utf-8');
    const importedLeads: any[] = [];
    const errors: Array<{ row?: number; error: string }> = [];
    let rowNumber = 0;

    // Create a mapping object for quick lookup
    const fieldMap: Record<string, string> = {};
    mappings.forEach((mapping: any) => {
      if (mapping.leadField && mapping.leadField !== 'ignore') {
        fieldMap[mapping.csvColumn] = mapping.leadField;
      }
    });

    // Parse CSV and import leads
    const parser = csv.parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      cast: false,
      max_record_size: 50000
    });

    parser.on('readable', async function() {
      let record;
      while ((record = parser.read()) !== null) {
        rowNumber++;
        
        try {
          // Map CSV fields to lead fields
          const leadData: any = {
            source: 'csv_import',
            status: 'new'
          };

          // Apply field mappings
          Object.entries(record).forEach(([csvField, value]) => {
            const leadField = fieldMap[csvField];
            if (leadField && value) {
              if (leadField === 'income' || leadField === 'creditScore' || leadField === 'qualificationScore') {
                // Convert to number for numeric fields
                const numValue = parseInt(value as string, 10);
                if (!isNaN(numValue)) {
                  leadData[leadField] = numValue;
                }
              } else if (leadField === 'metadata') {
                // Handle custom fields
                if (!leadData.metadata) {
                  leadData.metadata = {};
                }
                leadData.metadata[csvField] = value;
              } else {
                leadData[leadField] = value;
              }
            }
          });

          // Add campaign ID if provided
          if (campaignId) {
            leadData.campaignId = campaignId;
          }

          // Validate required fields
          if (!leadData.email) {
            errors.push({
              row: rowNumber,
              error: 'Email is required'
            });
            continue;
          }

          // Check for duplicate email
          const [existing] = await db
            .select()
            .from(leads)
            .where(eq(leads.email, leadData.email))
            .limit(1);

          if (existing) {
            errors.push({
              row: rowNumber,
              error: `Duplicate email: ${leadData.email}`
            });
            continue;
          }

          // Insert the lead
          const [newLead] = await db
            .insert(leads)
            .values({
              ...leadData,
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning();

          importedLeads.push(newLead);

        } catch (error) {
          logger.error('Error importing lead row:', error);
          errors.push({
            row: rowNumber,
            error: error instanceof Error ? error.message : 'Import failed'
          });
        }
      }
    });

    parser.on('error', function(err) {
      logger.error('CSV import parsing error:', err);
      res.status(400).json({
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'Failed to parse CSV file during import',
          details: err.message
        }
      });
    });

    parser.write(fileContent);
    parser.end();

    await new Promise((resolve) => parser.on('end', resolve));

    res.json({
      total: rowNumber,
      successful: importedLeads.length,
      failed: errors.length,
      errors: errors.slice(0, 100) // Limit errors returned
    });

  } catch (error) {
    logger.error('Error importing leads:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'IMPORT_ERROR',
        message: 'Failed to import leads',
        category: 'processing'
      }
    });
  }
});

export default router;