import React from 'react';
import { useDashboardFilter } from '@/hooks/useDashboardFilter';
import { useCompanies } from '@/integrations/supabase/companies';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const DashboardFilter: React.FC = () => {
  const { t } = useTranslation();
  const { 
    isSuperAdmin, 
    selectedCompanyId, 
    setSelectedCompanyId, 
    isLoadingFilter 
  } = useDashboardFilter();
  
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
  
  if (!isSuperAdmin) {
    // Se não for Super Admin, não exibe o filtro, pois o usuário está fixo na sua empresa.
    return null;
  }
  
  const isLoading = isLoadingFilter || isLoadingCompanies;

  return (
    <div className="w-full md:w-64">
      <Select 
        onValueChange={setSelectedCompanyId} 
        value={selectedCompanyId} 
        disabled={isLoading}
      >
        <SelectTrigger className="w-full">
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Building className="mr-2 h-4 w-4 text-muted-foreground" />
          )}
          <SelectValue placeholder={t('filter_all_companies')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('filter_all_companies')}</SelectItem>
          {companies?.map((company) => (
            <SelectItem key={company.id} value={company.id}>
              {company.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};