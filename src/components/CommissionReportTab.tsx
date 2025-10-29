import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, RefreshCw, DollarSign, HandCoins, Building, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { useDashboardFilter } from '@/hooks/useDashboardFilter';
import { useCommissionReport, CommissionRecordReport } from '@/integrations/supabase/reportHooks'; // Alterado para useCommissionReport
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ExportButton from './ExportButton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showError } from '@/utils/toast';
import { useCompanies } from '@/integrations/supabase/companies';
import CommissionDetailsDialog from './CommissionDetailsDialog'; // NOVO IMPORT
import CommissionPaymentTable from './CommissionPaymentTable'; // Importando a tabela atualizada

const statusOptions: CommissionRecordReport['status'][] = ['pendente', 'pago', 'cancelado'];

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
  const [statusFilter, setStatusFilter] = useState<CommissionRecordReport['status'] | 'all'>('all');
  
  // Estados do Modal de Detalhes
  const [viewingRecord, setViewingRecord] = useState<CommissionRecordReport | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

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
        (record.empresas?.nome && record.empresas.nome.toLowerCase().includes(lowerCaseSearch))
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
  
  const handleRowClick = (record: CommissionRecordReport) => {
    setViewingRecord(record);
    setIsDetailsDialogOpen(true);
  };
  
  const handleCloseDetailsDialog = (open: boolean) => {
    setIsDetailsDialogOpen(open);
    if (!open) {
      setViewingRecord(null);
    }
  };


  if (isError && error) {
    // Removido showError para evitar loop infinito, o erro é tratado no componente pai
  }

  return (
    <>
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
            <Select onValueChange={(val) => setStatusFilter(val as CommissionRecordReport['status'] | 'all')} value={statusFilter} disabled={isDataLoading}>
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
              {/* Exportação movida para a tabela */}
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
          ) : filteredRecords.length > 0 ? (
            <CommissionPaymentTable records={filteredRecords} onRowClick={handleRowClick} />
          ) : (
            <div className="text-center p-4 text-muted-foreground">
              {t('no_commission_records_found', { defaultValue: 'Nenhum registro de comissão encontrado.' })}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Modal de Detalhes */}
      {viewingRecord && (
        <CommissionDetailsDialog
          record={viewingRecord}
          isOpen={isDetailsDialogOpen}
          onOpenChange={handleCloseDetailsDialog}
        />
      )}
    </>
  );
};

export default CommissionReportTab;