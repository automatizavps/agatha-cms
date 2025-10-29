import React from 'react';
import { useTeams } from '@/integrations/supabase/teams';
import { useTranslation } from 'react-i18next';
import { Loader2, Target, Users, DollarSign } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CompanyTeamsTabProps {
  companyId: string;
}

const CompanyTeamsTab: React.FC<CompanyTeamsTabProps> = ({ companyId }) => {
  const { t } = useTranslation();
  // Filtra equipes pela empresa
  const { data: teams, isLoading, isError } = useTeams(companyId);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (isError || !teams || teams.length === 0) {
    return <p className="text-center text-muted-foreground p-4">{t('no_teams_found')}</p>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Target className="h-5 w-5" /> {t('nav_teams')} ({teams.length})
      </h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('team_name')}</TableHead>
              <TableHead className="hidden sm:table-cell">{t('team_meta_value')}</TableHead>
              <TableHead className="hidden md:table-cell">{t('team_meta_quantity')}</TableHead>
              <TableHead className="hidden lg:table-cell">{t('order_table_header_date')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.map((team) => (
              <TableRow key={team.id}>
                <TableCell className="font-medium">{team.nome}</TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {formatCurrency(team.meta_mensal_valor)}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {team.meta_mensal_quantidade} {t('units')}
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                  {format(new Date(team.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CompanyTeamsTab;