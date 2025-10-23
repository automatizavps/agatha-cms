import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Team } from '@/integrations/supabase/teams';
import { DollarSign, Target, Users } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from 'react-i18next';

interface TeamGoalsCardProps {
  team: Team;
}

const TeamGoalsCard: React.FC<TeamGoalsCardProps> = ({ team }) => {
  const { t } = useTranslation();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          {team.nome}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        
        {/* Meta de Valor */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            {t('team_meta_value')}
          </div>
          <span className="text-lg font-bold text-primary">
            {formatCurrency(team.meta_mensal_valor)}
          </span>
        </div>
        
        <Separator />

        {/* Meta de Quantidade */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {t('team_meta_quantity')}
          </div>
          <span className="text-lg font-bold">
            {team.meta_mensal_quantidade} {t('units')}
          </span>
        </div>
        
        {/* TODO: Adicionar progresso real aqui */}
        <p className="text-xs text-muted-foreground pt-2">
          {t('team_goals_progress_placeholder')}
        </p>
      </CardContent>
    </Card>
  );
};

export default TeamGoalsCard;