import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, RefreshCw, Target, DollarSign, Users, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { useDashboardFilter } from '@/hooks/useDashboardFilter';
import { useTeamReport } from '@/integrations/supabase/reportHooks';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ExportButton from './ExportButton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Importado
import { useCompanies } from '@/integrations/supabase/companies'; // Importado

const TeamReportTab: React.FC = () => {
  const { t } = useTranslation();
  const { 
    filteredCompanyId, 
    isLoadingFilter, 
    isSuperAdmin, 
    selectedCompanyId, 
    setSelectedCompanyId 
  } = useDashboardFilter();
  
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies(); // Novo
  
  // Estados de Filtro
  const [searchTerm, setSearchTerm] = useState('');

  // Hook de Dados
  const { data: teams, isLoading, isError, error, refetch, isRefetching } = useTeamReport(filteredCompanyId);
  
  const isDataLoading = isLoading || isLoadingFilter || (isSuperAdmin && isLoadingCompanies);

  const filteredTeams = useMemo(() => {
    if (!teams) return [];
    let filtered = teams;
    
    // 1. Filtragem por Termo de Busca
    if (searchTerm) {
      const lowerCaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(team => 
        team.nome.toLowerCase().includes(lowerCaseSearch) ||
        (team.empresas?.nome && team.empresas.nome.toLowerCase().includes(lowerCaseSearch))
      );
    }

    return filtered;
  }, [teams, searchTerm]);
  
  const totalTeams = filteredTeams.length;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };
  
  // Mapeamento de dados para exportação
  const exportData = useMemo(() => {
    return filteredTeams.map(team => ({
      ID_Equipe: team.id,
      Nome: team.nome,
      Meta_Valor: team.meta_mensal_valor,
      Meta_Quantidade: team.meta_mensal_quantidade,
      Data_Criacao: format(new Date(team.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
      Empresa: team.empresas?.nome || 'N/A',
      Membros: team.membros.map(m => m.usuarios?.nome_completo || 'N/A').join('; '),
    }));
  }, [filteredTeams]);


  if (isError && error) {
    // Removido showError para evitar loop infinito, o erro é tratado no componente pai
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5" /> {t('team_list_title')}
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
          
          {/* Campo de Busca Textual */}
          <div className="relative w-full max-w-sm md:max-w-none md:flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('team_search_placeholder')}
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
              fileName={`Relatorio_Equipes_${format(new Date(), 'yyyyMMdd')}`}
              disabled={isDataLoading || filteredTeams.length === 0}
              isLoading={false}
            />
          </div>
        </div>
        
        {/* Métrica de Total de Equipes */}
        <div className="mb-4 p-4 border rounded-lg bg-secondary/50 flex items-center justify-between">
          <span className="text-sm font-medium">{t('page_title_teams')}:</span>
          <span className="text-xl font-bold text-primary flex items-center gap-1">
            <Target className="h-5 w-5" />
            {totalTeams}
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
        ) : filteredTeams.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('team_name')}</TableHead>
                  {isSuperAdmin && <TableHead className="hidden md:table-cell">{t('user_table_header_company')}</TableHead>}
                  <TableHead className="hidden sm:table-cell">{t('team_members')}</TableHead>
                  <TableHead className="text-right hidden md:table-cell">{t('team_meta_value')}</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">{t('team_meta_quantity')}</TableHead>
                  <TableHead className="hidden xl:table-cell">{t('order_table_header_date')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell className="font-medium">{team.nome}</TableCell>
                    {isSuperAdmin && (
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {team.empresas?.nome || 'N/A'}
                      </TableCell>
                    )}
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {team.membros.length > 0 ? team.membros.map(m => m.usuarios?.nome_completo || 'N/A').join(', ') : t('no_members')}
                    </TableCell>
                    <TableCell className="text-right hidden md:table-cell font-semibold text-primary">
                      {formatCurrency(team.meta_mensal_valor)}
                    </TableCell>
                    <TableCell className="text-right hidden lg:table-cell text-sm text-muted-foreground">
                      {team.meta_mensal_quantidade} {t('units')}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                      {format(new Date(team.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center p-4 text-muted-foreground">
            {t('no_teams_found')}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TeamReportTab;