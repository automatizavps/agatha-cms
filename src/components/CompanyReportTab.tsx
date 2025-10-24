import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, RefreshCw, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { useDashboardFilter } from '@/hooks/useDashboardFilter';
import { useCompanyReport } from '@/integrations/supabase/reportHooks';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ExportButton from './ExportButton';
import { PermissionGuard } from '@/hooks/use-permission';
import { formatToSaoPaulo } from '@/utils/date'; // Importando utilitário de data

const CompanyReportTabContent: React.FC = () => {
  const { t } = useTranslation();
  const { isLoadingFilter } = useDashboardFilter();
  
  // Hook de Dados (não precisa de companyId, pois RLS/hook já filtra)
  const { data: companies, isLoading, isError, error, refetch, isRefetching } = useCompanyReport();
  
  // Estados de Filtro
  const [searchTerm, setSearchTerm] = useState('');
  
  const isDataLoading = isLoading || isLoadingFilter;

  const filteredCompanies = useMemo(() => {
    if (!companies) return [];
    let filtered = companies;
    
    // 1. Filtragem por Termo de Busca
    if (searchTerm) {
      const lowerCaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(company => 
        company.nome.toLowerCase().includes(lowerCaseSearch) ||
        (company.cnpj && company.cnpj.toLowerCase().includes(lowerCaseSearch)) ||
        (company.email && company.email.toLowerCase().includes(lowerCaseSearch))
      );
    }

    return filtered;
  }, [companies, searchTerm]);
  
  const totalCompanies = filteredCompanies.length;
  
  // Mapeamento de dados para exportação
  const exportData = useMemo(() => {
    return filteredCompanies.map(company => ({
      ID_Empresa: company.id,
      Nome: company.nome,
      CNPJ: company.cnpj || 'N/A',
      Email: company.email || 'N/A',
      Telefone: company.telefone || 'N/A',
      Endereco: company.endereco_completo || 'N/A',
      Data_Criacao: formatToSaoPaulo(company.created_at, 'dd/MM/yyyy HH:mm'), // Usando utilitário
    }));
  }, [filteredCompanies]);


  if (isError && error) {
    showError(t("error_loading_data") + ": " + error.message);
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" /> {t('company_list_title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        
        {/* Filtros e Ações */}
        <div className="flex flex-col md:flex-row items-start md:items-center mb-4 gap-3 flex-wrap">
          
          {/* Campo de Busca Textual */}
          <div className="relative w-full max-w-sm md:max-w-none md:flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              disabled={isDataLoading}
            />
          </div>
          
          {/* Botões de Ação */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => refetch()} 
              disabled={isRefetching}
              className="shrink-0"
            >
              {isRefetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            <ExportButton 
              data={exportData} 
              fileName={`Relatorio_Empresas_${format(new Date(), 'yyyyMMdd')}`}
              disabled={isDataLoading || filteredCompanies.length === 0}
              isLoading={false}
            />
          </div>
        </div>
        
        {/* Métrica de Total de Empresas */}
        <div className="mb-4 p-4 border rounded-lg bg-secondary/50 flex items-center justify-between">
          <span className="text-sm font-medium">{t('page_title_companies')}:</span>
          <span className="text-xl font-bold text-primary flex items-center gap-1">
            <Building className="h-5 w-5" />
            {totalCompanies}
          </span>
        </div>

        {/* Tabela de Dados */}
        {isDataLoading && !isRefetching ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="text-center p-4 text-destructive">
            {t('chart_error')}
          </div>
        ) : filteredCompanies.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('user_table_header_name')}</TableHead>
                  <TableHead className="hidden sm:table-cell">CNPJ</TableHead>
                  <TableHead className="hidden md:table-cell">{t('profile_email')}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t('user_table_header_phone')}</TableHead>
                  <TableHead className="hidden xl:table-cell">{t('order_table_header_date')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">{company.nome}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{company.cnpj || 'N/A'}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{company.email || 'N/A'}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{company.telefone || 'N/A'}</TableCell>
                    <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                      {formatToSaoPaulo(company.created_at, "dd/MM/yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center p-4 text-muted-foreground">
            {t('no_companies_found')}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const CompanyReportTab = () => (
  // Apenas Super Admin (Perfil ID 1) pode ver o relatório de todas as empresas
  <PermissionGuard allowedProfileIds={[1]}>
    <CompanyReportTabContent />
  </PermissionGuard>
);

export default CompanyReportTab;