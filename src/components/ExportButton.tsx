import React from 'react';
import { FileText, FileSpreadsheet, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportToExcel, flattenDataForExport } from '@/utils/export';
import { showSuccess, showError } from '@/utils/toast';
import { useTranslation } from 'react-i18next';

interface ExportButtonProps {
  data: any[];
  fileName: string;
  disabled: boolean;
  isLoading: boolean;
}

const ExportButton: React.FC<ExportButtonProps> = ({ data, fileName, disabled, isLoading }) => {
  const { t } = useTranslation();

  const handleExport = (format: 'xlsx' | 'csv') => {
    if (data.length === 0) {
      showError(t('export_no_data'));
      return;
    }
    
    try {
      // Achata os dados para garantir que objetos aninhados sejam exportados corretamente
      const flattenedData = flattenDataForExport(data);
      
      exportToExcel(flattenedData, fileName, t('export_sheet_name'), format);
      showSuccess(t('export_success', { format: format.toUpperCase() }));
    } catch (e: any) {
      showError(t('export_error') + e.message);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={disabled || isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {t('export_data')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('export_select_format')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleExport('xlsx')}>
          <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          <FileText className="mr-2 h-4 w-4" /> CSV (.csv)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportButton;