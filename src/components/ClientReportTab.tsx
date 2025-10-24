import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, RefreshCw, Users, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { useDashboardFilter } from '@/hooks/useDashboardFilter';
import { useClientReport } from '@/integrations/supabase/reportHooks';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ExportButton from './ExportButton';
import { formatToSaoPaulo } from '@/utils/date'; // Importando utilitário de data

const ClientReportTab: React.FC = () => {
  const { t } = useTranslation();
  const { filteredCompanyId, isLoadingFilter, isSuperAdmin } = useDashboardFilter();
  
  // Estados de Filtro
  const [searchTerm, setSearchTerm] = useState('');

  // Hook de Dados
  const { data: clients, isLoading, isError, error, refetch, isRefetching } = useClientReport(filteredCompanyId);
  
  const isDataLoading = isLoading || isLoadingFilter;

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    let filtered = clients;
    
    // 1. Filtragem por Termo de Busca
    if (searchTerm) {
      const lowerCaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(client => 
        client.nome.toLowerCase().includes(lowerCaseSearch) ||
        (client.email && client.email.toLowerCase().includes(lowerCaseSearch)) ||
        (client.telefone && client.telefone.toLowerCase().includes(lowerCaseSearch)) ||
        (client.endereco_completo && client.endereco_completo.toLowerCase().includes(lowerCaseSearch))
      );
    }

    return filtered;
  }, [clients, searchTerm]);
  
  const totalClients = filteredClients.length;
  
  // Mapeamento de dados para exportação
  const exportData = useMemo(() => {
    return filteredClients.map(client => ({
      ID_Cliente: client.id,
      Nome: client.nome,
      Email: client.email || 'N/A',
      Telefone: client.telefone || 'N/A',
      Endereco: client.endereco_completo || 'N/A',
      Data_Cadastro: formatToSaoPaulo(client.created_at, 'dd/MM/yyyy HH:mm'), // Usando utilitário
      Empresa: client.empresa?.nome || 'N/A',
    }));
  }, [filteredClients]);


  if (isError && error) {
    showError(t("error_loading_data") + ": " + error.message);
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" /> {t('client_list_title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        
        {/* Filtros e Ações */}
        <div className="flex flex-col md:flex-row items-start md:items-center mb-4 gap-3 flex-wrap">
          
          {/* Campo de Busca Textual */}
          <div className="relative w-full max-w-sm md:max-w-none md:flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('client_search_placeholder')}
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
              fileName={`Relatorio_Clientes_${format(new Date(), 'yyyyMMdd')}`}
              disabled={isDataLoading || filteredClients.length === 0}
              isLoading={false}
            />
          </div>
        </div>
        
        {/* Métrica de Total de Clientes */}
        <div className="mb-4 p-4 border rounded-lg bg-secondary/50 flex items-center justify-between">
          <span className="text-sm font-medium">{t('total_clients')}:</span>
          <span className="text-xl font-bold text-primary flex items-center gap-1">
            <Users className="h-5 w-5" />
            {totalClients}
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
        ) : filteredClients.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('user_table_header_name')}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t('profile_email')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('user_table_header_phone')}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t('client_table_header_address')}</TableHead>
                  {isSuperAdmin && <TableHead className="hidden md:table-cell">{t('user_table_header_company')}</TableHead>}
                  <TableHead className="hidden xl:table-cell">{t('order_table_header_date')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.nome}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{client.email || 'N/A'}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{client.telefone || 'N/A'}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{client.endereco_completo || 'N/A'}</TableCell>
                    {isSuperAdmin && (
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {client.empresa?.nome || 'N/A'}
                      </TableCell>
                    )}
                    <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                      {formatToSaoPaulo(client.created_at, "dd/MM/yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center p-4 text-muted-foreground">
            {t('no_clients_found')}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientReportTab;