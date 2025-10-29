import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, RefreshCw, DollarSign, HandCoins, Building, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { useDashboardFilter } from '@/hooks/useDashboardFilter';
import { useCommissionReport, CommissionRecord } from '@/integrations/supabase/reportHooks'; // Alterado para useCommissionReport
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ExportButton from './ExportButton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showError } from '@/utils/toast';
import { useCompanies } from '@/integrations/supabase/companies';

const statusOptions: CommissionRecord['status'][] = ['pendente', 'pago', 'cancelado'];

const CommissionReportTab: React.FC = () => {
  const { t } = useTranslation();
  const { 
    filteredCompanyId, 
    isLoadingFilter, 
    isSuperAdmin, 
    selectedCompanyId, 
    setSelectedCompanyId 
  } = useDashboardFilter();
  
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
  
  // Estados de Filtro
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<CommissionRecord['status'] | 'all'>('all');

  // Hook de Dados (usando filteredCompanyId)
  const { data: records, isLoading, isError, error, refetch, isRefetching } = useCommissionReport(filteredCompanyId);
  
  const isDataLoading = isLoading || isLoadingFilter || (isSuperAdmin && isLoadingCompanies);

  const filteredRecords = useMemo(() => {
    if (!records) return [];
    let filtered = records;

    // 1. Filtragem por Status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(record => record.status === statusFilter);
    }
    
    // 2. Filtragem por Termo de Busca
    if (searchTerm) {
      const lowerCaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(record => 
        record.usuarios?.nome_completo.toLowerCase().includes(lowerCaseSearch) ||
        record.referencia_id.slice(0, 8).toLowerCase().includes(lowerCaseSearch) ||
        record.tipo_referencia.toLowerCase().includes(lowerCaseSearch) ||
        (record.empresas?.nome && record.empresas.nome.toLowerCase().includes(lowerCaseSearch)) // NOVO: Busca por empresa
      );
    }

    return filtered;
  }, [records, searchTerm, statusFilter]);
  
  const totalCommissionValue = filteredRecords.reduce((sum, record) => sum + record.valor_comissao, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };
  
  const getStatusBadge = (status: CommissionRecord['status']) => {
    const baseClasses = "capitalize px-3 py-1 rounded-full text-xs font-semibold";
    switch (status) {
      case 'pago':
        return <span className={cn(baseClasses, "bg-green-700/80 text-green-200 dark:bg-green-900/80 dark:text-green-300")}>{t('paid')}</span>;
      case 'cancelado':
        return <span className={cn(baseClasses, "bg-red-700/80 text-red-200 dark:bg-red-900/80 dark:text-red-300")}>{t('cancelado')}</span>;
      case 'pendente':
      default:
        return <span className={cn(baseClasses, "bg-yellow-700/80 text-yellow-200 dark:bg-yellow-900/80 dark:text-yellow-300")}>{t('pending')}</span>;
    }
  };
  
  // Mapeamento de dados para exportação
  const exportData = useMemo(() => {
    return filteredRecords.map(record => ({
      ID_Comissao: record.id,
      Data_Criacao: format(new Date(record.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
      Status: record.status.toUpperCase(),
      Valor_Comissao: record.valor_comissao,
      Usuario: record.usuarios?.nome_completo || 'N/A',
      Tipo_Referencia: record.tipo_referencia.toUpperCase(),
      ID_Referencia: record.referencia_id,
      Empresa: record.empresas?.nome || 'N/A', // Adicionado Empresa
    }));
  }, [filteredRecords]);


  if (isError && error) {
    // Removido showError para evitar loop infinito, o erro é tratado no componente pai
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <HandCoins className="h-5 w-5" /> {t('commission_report_title', { defaultValue: 'Relatório de Comissionamento' })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        
        {/* Filtros e Ações */}
        <div className="flex flex-col md:flex-row items-start md:items-center mb-4 gap-3 flex-wrap">
          
          {/* Filtro de Empresa (Apenas para Super Admin) */}
          {isSuperAdmin && (
            <div className="w-full md:w-48">
              <Select 
                onValueChange={(value) => setSelectedCompanyId(value)} 
                value={selectedCompanyId} 
                disabled={isLoadingCompanies || isDataLoading}
              >
                <SelectTrigger className="w-full">
                  <Building className="mr-2 h-4 w-4 text-muted-foreground" />
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
          )}
          
          {/* Filtro de Status */}
          <Select onValueChange={(val) => setStatusFilter(val as CommissionRecord['status'] | 'all')} value={statusFilter} disabled={isDataLoading}>
            <SelectTrigger className="w-full md:w-[180px]">
              <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder={t('filter_all_status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filter_all_status')}</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status} className="capitalize">
                  {t(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Campo de Busca Textual */}
          <div className="relative w-full max-w-sm md:max-w-none md:flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('commission_report_search_placeholder', { defaultValue: 'Buscar por usuário ou referência...' })}
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
              fileName={`Relatorio_Comissoes_${format(new Date(), 'yyyyMMdd')}`}
              disabled={isDataLoading || filteredRecords.length === 0}
              isLoading={false}
            />
          </div>
        </div>
        
        {/* Métrica de Valor Total de Comissões */}
        <div className="mb-4 p-4 border rounded-lg bg-secondary/50 flex items-center justify-between">
          <span className="text-sm font-medium">{t('report_total_commission_value', { defaultValue: 'Valor Total de Comissões' })}:</span>
          <span className="text-xl font-bold text-primary flex items-center gap-1">
            {formatCurrency(totalCommissionValue)}
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
        ) : filteredRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('commission_table_header_user', { defaultValue: 'Usuário' })}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t('commission_table_header_type', { defaultValue: 'Tipo' })}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('commission_table_header_reference', { defaultValue: 'Referência' })}</TableHead>
                  <TableHead className="text-right">{t('commission_value', { defaultValue: 'Valor' })}</TableHead>
                  <TableHead className="text-center">{t('order_table_header_status')}</TableHead>
                  {isSuperAdmin && <TableHead className="hidden xl:table-cell">{t('user_table_header_company')}</TableHead>}
                  <TableHead className="hidden lg:table-cell">{t('order_table_header_date')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.usuarios?.nome_completo || 'N/A'}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground capitalize">
                      {t(record.tipo_referencia)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {record.referencia_id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      {formatCurrency(record.valor_comissao)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(record.status)}
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                        {record.empresas?.nome || 'N/A'}
                      </TableCell>
                    )}
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {format(new Date(record.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center p-4 text-muted-foreground">
            {t('no_commission_records_found', { defaultValue: 'Nenhum registro de comissão encontrado.' })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CommissionReportTab;