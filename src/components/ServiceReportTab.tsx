import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, RefreshCw, CalendarIcon, Filter, CalendarCheck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { useDashboardFilter } from '@/hooks/useDashboardFilter';
import { useAppointmentReport } from '@/integrations/supabase/reportHooks';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import ExportButton from './ExportButton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Appointment } from '@/integrations/supabase/appointments';
import { formatToSaoPaulo } from '@/utils/date'; // Importando utilitário de data

const statusOptions: Appointment['status'][] = ['pendente', 'confirmado', 'cancelado', 'concluido'];

const ServiceReportTab: React.FC = () => {
  const { t } = useTranslation();
  const { filteredCompanyId, isLoadingFilter } = useDashboardFilter();
  
  // Estados de Filtro
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Appointment['status'] | 'all'>('all');

  // Hook de Dados
  const { data: appointments, isLoading, isError, error, refetch, isRefetching } = useAppointmentReport(
    filteredCompanyId,
    {
      startDate: startDate ? format(startDate, 'yyyy-MM-dd') : '',
      endDate: endDate ? format(endDate, 'yyyy-MM-dd') : '',
    }
  );
  
  const isDataLoading = isLoading || isLoadingFilter;

  const filteredAppointments = useMemo(() => {
    if (!appointments) return [];
    let filtered = appointments;

    // 1. Filtragem por Status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === statusFilter);
    }
    
    // 2. Filtragem por Termo de Busca
    if (searchTerm) {
      const lowerCaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(app => 
        app.clientes?.nome.toLowerCase().includes(lowerCaseSearch) ||
        app.responsavel?.nome_completo.toLowerCase().includes(lowerCaseSearch) ||
        app.status.toLowerCase().includes(lowerCaseSearch)
      );
    }

    return filtered;
  }, [appointments, searchTerm, statusFilter]);
  
  const totalCompletedServices = filteredAppointments.filter(a => a.status === 'concluido').length;

  const getStatusBadge = (status: Appointment['status']) => {
    const baseClasses = "capitalize px-2 py-1 rounded-full text-xs font-semibold";
    switch (status) {
      case 'confirmado':
        return <span className={cn(baseClasses, "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200")}>{t(status)}</span>;
      case 'cancelado':
        return <span className={cn(baseClasses, "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200")}>{t(status)}</span>;
      case 'concluido':
        return <span className={cn(baseClasses, "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200")}>{t(status)}</span>;
      case 'pendente':
      default:
        return <span className={cn(baseClasses, "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200")}>{t(status)}</span>;
    }
  };
  
  // Mapeamento de dados para exportação
  const exportData = useMemo(() => {
    return filteredAppointments.map(app => ({
      ID_Agendamento: app.id,
      Data_Hora: formatToSaoPaulo(app.data_hora), // Usando utilitário
      Status: app.status.toUpperCase(),
      Cliente_Nome: app.clientes?.nome || 'N/A',
      Cliente_Email: app.clientes?.email || 'N/A',
      Cliente_Telefone: app.clientes?.telefone || 'N/A',
      Cliente_Endereco: app.clientes?.endereco_completo || 'N/A',
      Responsavel: app.responsavel?.nome_completo || 'N/A',
      Itens: app.agendamento_itens.map(item => 
        `${item.produtos?.nome || 'N/A'} (x${item.quantidade} @ R$ ${item.preco_unitario})`
      ).join('; '),
    }));
  }, [filteredAppointments]);


  if (isError && error) {
    showError(t("error_loading_data") + ": " + error.message);
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5" /> {t('nav_appointments')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        
        {/* Filtros e Ações */}
        <div className="flex flex-col md:flex-row items-start md:items-center mb-4 gap-3 flex-wrap">
          
          {/* Filtro de Data */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full md:w-[280px] justify-start text-left font-normal",
                  (!startDate || !endDate) && "text-muted-foreground"
                )}
                disabled={isDataLoading}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate && endDate ? (
                  `${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}`
                ) : (
                  <span>{t('select_date_range')}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{ from: startDate, to: endDate }}
                onSelect={(range) => {
                  setStartDate(range?.from);
                  setEndDate(range?.to);
                }}
                numberOfMonths={2}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
          
          {/* Filtro de Status */}
          <Select onValueChange={(val) => setStatusFilter(val as Appointment['status'] | 'all')} value={statusFilter} disabled={isDataLoading}>
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
              placeholder={t('appointment_search_placeholder')}
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
              fileName={`Relatorio_Agendamentos_${format(new Date(), 'yyyyMMdd')}`}
              disabled={isDataLoading || filteredAppointments.length === 0}
              isLoading={false}
            />
          </div>
        </div>
        
        {/* Métrica de Serviços Concluídos */}
        <div className="mb-4 p-4 border rounded-lg bg-secondary/50 flex items-center justify-between">
          <span className="text-sm font-medium">{t('report_total_completed_services')}:</span>
          <span className="text-xl font-bold text-primary flex items-center gap-1">
            <Clock className="h-5 w-5" />
            {totalCompletedServices}
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
        ) : filteredAppointments.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('order_table_header_id')}</TableHead>
                  <TableHead>{t('order_table_header_client')}</TableHead>
                  <TableHead>{t('responsible')}</TableHead>
                  <TableHead>{t('order_table_header_date')}</TableHead>
                  <TableHead className="text-center">{t('order_table_header_status')}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t('nav_products_services')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAppointments.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium text-xs text-muted-foreground">
                      {app.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {app.clientes?.nome || t('no_data_found')}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {app.responsavel?.nome_completo || 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatToSaoPaulo(app.data_hora)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(app.status)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {app.agendamento_itens.map(item => 
                        `${item.produtos?.nome || 'N/A'} (x${item.quantidade})`
                      ).join(', ')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center p-4 text-muted-foreground">
            {t('no_data_found')}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ServiceReportTab;