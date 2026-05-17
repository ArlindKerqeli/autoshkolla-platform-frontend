'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';

interface ExportButtonProps {
  resource: string;
  params?: Record<string, string>;
  disabled?: boolean;
}

export function ExportButton({ resource, params = {}, disabled = false }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: 'xlsx' | 'csv') => {
    setExporting(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      // Filter out empty params
      const cleanParams: Record<string, string> = { format };
      Object.entries(params).forEach(([k, v]) => {
        if (v && v !== 'all') cleanParams[k] = v;
      });
      const queryString = new URLSearchParams(cleanParams).toString();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002';
      const response = await fetch(
        `${apiUrl}/api/v1/export/${resource}?${queryString}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) {
        throw new Error('Export failed');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${resource}-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({ title: 'Eksportimi u krye me sukses' });
    } catch {
      toast({
        title: 'Gabim',
        description: 'Eksportimi deshtoi. Provoni perseri.',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || exporting}>
          <Download className="mr-2 h-4 w-4" />
          {exporting ? 'Duke eksportuar...' : 'Eksporto'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('xlsx')}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          <FileText className="mr-2 h-4 w-4" />
          CSV (.csv)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
