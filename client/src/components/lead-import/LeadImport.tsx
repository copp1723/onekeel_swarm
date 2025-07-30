import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Check, AlertCircle, FileSpreadsheet, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface FieldMapping {
  csvColumn: string;
  leadField: string;
  defaultValue?: string;
}

interface AnalyzeResult {
  headers: string[];
  previewRows: Record<string, any>[];
  suggestedMappings: FieldMapping[];
  totalRows: number;
}

interface ImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ row?: number; error: string }>;
}

interface Campaign {
  id: string;
  name: string;
}

const LEAD_FIELDS = [
  { value: 'name', label: 'Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'source', label: 'Source' },
  { value: 'campaign', label: 'Campaign' },
  { value: 'metadata', label: 'Custom Field' }
];

export function LeadImport() {
  const [file, setFile] = useState<File | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Mock campaigns data until you have a proper hook
  const campaigns: Campaign[] = [
    { id: '1', name: 'Spring 2025 Campaign' },
    { id: '2', name: 'Summer Promo' },
    { id: '3', name: 'New Customer Outreach' }
  ];

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const csvFile = acceptedFiles[0];
    setFile(csvFile);
    setError(null);
    setImportResult(null);

    // Analyze the CSV file
    const formData = new FormData();
    formData.append('file', csvFile);

    try {
      const response = await fetch('/api/import/analyze', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to analyze CSV file');
      }

      const result: AnalyzeResult = await response.json();
      setAnalyzeResult(result);
      setMappings(result.suggestedMappings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze file');
      setFile(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    maxFiles: 1
  });

  const updateMapping = (index: number, field: keyof FieldMapping, value: string) => {
    const newMappings = [...mappings];
    newMappings[index] = { ...newMappings[index], [field]: value };
    setMappings(newMappings);
  };

  const handleImport = async () => {
    if (!file || !analyzeResult) return;

    setImporting(true);
    setProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('mappings', JSON.stringify(mappings));
    if (selectedCampaign) {
      formData.append('campaignId', selectedCampaign);
    }

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch('/api/import/leads', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        throw new Error('Failed to import leads');
      }

      const result: ImportResult = await response.json();
      setImportResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import leads');
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setAnalyzeResult(null);
    setMappings([]);
    setImportResult(null);
    setProgress(0);
    setError(null);
    setSelectedCampaign('');
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle>Import Leads from CSV</CardTitle>
          <CardDescription>
            Upload a CSV file to import leads into the system. Map your CSV columns to lead fields.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!file && !importResult && (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg mb-2">
                {isDragActive ? 'Drop the CSV file here' : 'Drag & drop a CSV file here'}
              </p>
              <p className="text-sm text-gray-500">or click to select a file</p>
              <p className="text-xs text-gray-400 mt-2">Maximum file size: 10MB</p>
            </div>
          )}

          {file && analyzeResult && !importResult && (
            <>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileSpreadsheet className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {analyzeResult.totalRows} rows • {analyzeResult.headers.length} columns
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={reset}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="campaign">Campaign (Optional)</Label>
                  <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                    <SelectTrigger id="campaign">
                      <SelectValue placeholder="Select a campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No campaign</SelectItem>
                      {campaigns?.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          {campaign.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500 mt-1">
                    Campaign defaults will be applied to imported leads
                  </p>
                </div>

                <div>
                  <h3 className="font-medium mb-3">Field Mappings</h3>
                  <div className="space-y-2">
                    {mappings.map((mapping, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <Badge variant="outline" className="bg-white">{mapping.csvColumn}</Badge>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        <div className="flex-1">
                          <Select
                            value={mapping.leadField}
                            onValueChange={(value) => updateMapping(index, 'leadField', value)}
                          >
                            <SelectTrigger className="bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {LEAD_FIELDS.map((field) => (
                                <SelectItem key={field.value} value={field.value}>
                                  {field.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-3">Preview</h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {analyzeResult.headers.map((header, index) => (
                            <TableHead key={index}>{header}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analyzeResult.previewRows.map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {analyzeResult.headers.map((header, colIndex) => (
                              <TableCell key={colIndex}>
                                {row[header] || <span className="text-gray-400">—</span>}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </>
          )}

          {importing && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Importing leads...</p>
              <Progress value={progress} />
            </div>
          )}

          {importResult && (
            <div className="space-y-4">
              <Alert variant={importResult.failed > 0 ? 'destructive' : 'default'}>
                <Check className="h-4 w-4" />
                <AlertDescription>
                  Import completed: {importResult.successful} successful, {importResult.failed} failed
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total Rows</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{importResult.total}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Successful</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-green-600">{importResult.successful}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Failed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-red-600">{importResult.failed}</p>
                  </CardContent>
                </Card>
              </div>

              {importResult.errors.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Errors</h3>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {importResult.errors.map((error, index) => (
                      <Alert key={index} variant="destructive" className="py-2">
                        <AlertDescription className="text-sm">
                          {error.row && `Row ${error.row}: `}{error.error}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          {importResult ? (
            <Button onClick={reset} className="w-full">
              Import More Leads
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={reset} disabled={!file || importing}>
                Cancel
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={!file || !analyzeResult || importing}
              >
                Import Leads
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}