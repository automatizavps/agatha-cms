import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, HandCoins, Search, Building, Filter, DollarSign } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDashboardFilter } from "@/hooks/useDashboardFilter";
import { useCompanies } from "@/integrations/supabase/companies";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCanRead } from "@/hooks/use-module-permission";
import { useCommissionReport, CommissionRecord } from "@/integrations/supabase/reportHooks";
import { useMemo, useState } from "react";
import { showError } from "@/utils/toast";
import CommissionPaymentTable from "@/components/CommissionPaymentTable"; // Será criado no próximo passo

const statusOptions: CommissionRecord['status'][] = ['pendente', 'pago', 'cancelado'];

const CommissionPayments = () => {
  const { t } = useTranslation();
  const { 
    filteredCompanyId, 
    isLoadingFilter, 
    isSuperAdmin, 
    selectedCompanyId, 
    setSelectedCompanyId 
  } = useDashboardFilter();
  
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
  
  const canReadCommissions = useCanRead('commissions');
  
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
        (record.empresas?.nome && record.empresas.nome.toLowerCase().includes(lowerCaseSearch))
      );
    }

    return filtered;
  }, [records, searchTerm, statusFilter]);
  
  const totalPendingValue = filteredRecords
    .filter(r => r.status === 'pendente')
    .reduce((sum, record) => sum + record.valor_comissao, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (!canReadCommissions) {
    return (
      <DashboardLayout>
        <div className="text-center p-4 text-destructive">
          {t('access_denied_module', { defaultValue: 'Acesso negado ao módulo de Comissionamento.' })}
        </div>
      </DashboardLayout>
    );
  }

  if (isError && error) {
    showError(t("error_loading_data") + ": " + error.message);
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl lg:text-2xl font-bold tracking-tight">{t('page_title_commission_payments', { defaultValue: 'Pagamentos de Comissão' })}</h1>
        {/* Aqui podemos adicionar um botão para Ações em Massa de Pagamento */}
      </div>
      
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5" /> {t('commission_payments_title', { defaultValue: 'Registros de Pagamento' })}
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
              {/* Exportação será adicionada no CommissionPaymentTable */}
            </div>
          </div>
          
          {/* Métrica de Valor Total Pendente */}
          <div className="mb-4 p-4 border rounded-lg bg-yellow-100/50 dark:bg-yellow-900/20 flex items-center justify-between">
            <span className="text-sm font-medium">{t('total_pending_commission', { defaultValue: 'Valor Total Pendente' })}:</span>
            <span className="text-xl font-bold text-yellow-700 dark:text-yellow-300 flex items-center gap-1">
              {formatCurrency(totalPendingValue)}
            </span>
          </div>

          {/* Tabela de Dados */}
          {isDataLoading && !isRefetching ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredRecords.length > 0 ? (
            <CommissionPaymentTable records={filteredRecords} />
          ) : (
            <div className="text-center p-4 text-muted-foreground">
              {t('no_commission_records_found', { defaultValue: 'Nenhum registro de comissão encontrado.' })}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default CommissionPayments;