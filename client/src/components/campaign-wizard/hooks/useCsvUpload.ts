import { useCallback, useState } from 'react';
import Papa from 'papaparse';
import { useDropzone } from 'react-dropzone';
import type { CampaignData } from '../types';

export function useCsvUpload(
  setData: React.Dispatch<React.SetStateAction<CampaignData>>,
) {
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  const onDrop = useCallback((files: File[]) => {
    setError('');
    const file = files[0];
    if (!file) return;

    if (file.size > 10*1024*1024) { setError('File size exceeds 10MB limit'); return; }
    if (!file.name.match(/\.csv$/i)) { setError('Only CSV files are allowed'); return; }

    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      complete: ({ data, errors, meta }) => {
        if (errors.length) { setError(`CSV parsing error: ${errors[0].message}`); return; }
        if (!data?.length) { setError('CSV file is empty');  return; }

        const headers = (meta.fields || []).slice(0,10);
        const map: Record<string,string> = {};

        headers.forEach(h=>{
          const l = h.toLowerCase().trim();
          if (!map.email && /email/.test(l)) map.email = h;
          if (!map.firstName && /(first.?name|fname|given)/.test(l)) map.firstName = h;
        });

        if (!map.email) { setError('Required column "Email" not found. Please ensure your CSV has a column with email addresses.'); return; }
        if (!map.firstName) { setError('Required column "First Name" not found. Please ensure your CSV has a column with first names.'); return; }

        const contacts = data.slice(0,10000)
          .filter((r: any) => r[map.email] && r[map.firstName])
          .map((r: any) => {
            const c:any = {};
            headers.forEach(h => { let v=(r as any)[h]; if(/^[-+=@]/.test(v)) v="'"+v; c[h]=String(v).slice(0,255);});
            return c;
          });

        setData(d=>({
          ...d,
          audience: {
            ...d.audience,
            contacts,
            headerMapping: map,
            targetCount: contacts.length,
          },
        }));
      },
      error: e => setError(`Error reading file: ${e.message}`),
    });
  }, [setData]);

  const dropzone = useDropzone({ onDrop, maxFiles:1, accept:{'text/csv':['.csv']} });
  return { dropzone, error, fileName };
}