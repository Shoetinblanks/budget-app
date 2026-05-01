'use client';

import React, { useState } from 'react';
import { Loader2, FileText } from 'lucide-react';
import Tesseract from 'tesseract.js';

interface OCRResult {
  gross: number;
  net: number;
  taxes: number;
  deductions: number;
}

export default function CheckStubUploader({ onScanComplete }: { onScanComplete: (result: OCRResult) => void }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      const result = await Tesseract.recognize(
        file,
        'eng',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              setProgress(Math.round(m.progress * 100));
            }
          }
        }
      );

      const text = result.data.text.toUpperCase();
      console.log('Raw OCR Text:', text);

      // Advanced Regex Parsing Logic
      // These are heuristics, actual check stubs vary wildly
      const extractMoney = (pattern: RegExp) => {
        const match = text.match(pattern);
        if (match && match[1]) {
          return parseFloat(match[1].replace(/,/g, ''));
        }
        return 0;
      };

      // Looking for lines like "GROSS PAY 2,500.00"
      const gross = extractMoney(/(?:GROSS|TOTAL EARNINGS|GROSS PAY).*?\$?\s*([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2})/i);
      const net = extractMoney(/(?:NET|NET PAY|TOTAL NET).*?\$?\s*([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2})/i);
      
      // Taxes might be specifically called out, or "TOTAL TAXES"
      const taxes = extractMoney(/(?:TAXES|TOTAL TAX|FED TAX|FED WITHHOLDING).*?\$?\s*([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2})/i);
      const deductions = extractMoney(/(?:DEDUCTIONS|TOTAL DED|PRE TAX).*?\$?\s*([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2})/i);

      onScanComplete({
        gross: gross || 0,
        net: net || 0,
        taxes: taxes || 0,
        deductions: deductions || 0
      });

    } catch (err: unknown) {
      console.error(err);
      setError('Failed to read check stub. Please try a clearer image or enter manually.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 border-dashed rounded-2xl p-6 relative group hover:border-emerald-500/50 transition-colors">
      <input 
        type="file" 
        accept="image/*,.pdf" 
        onChange={handleFileUpload} 
        disabled={loading}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
      />
      
      <div className="flex flex-col items-center justify-center text-center gap-3">
        {loading ? (
          <>
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <p className="text-zinc-300 font-bold text-sm">Scanning Document... {progress}%</p>
            <p className="text-zinc-500 text-xs">Our AI is reading your paystub.</p>
          </>
        ) : (
          <>
            <div className="p-3 bg-zinc-900 rounded-full group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-zinc-300 font-bold text-sm">Auto-fill via OCR</p>
              <p className="text-zinc-500 text-xs mt-1">Upload a photo of your check stub to instantly extract Gross, Net, and Taxes.</p>
            </div>
          </>
        )}
        
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      </div>
    </div>
  );
}
