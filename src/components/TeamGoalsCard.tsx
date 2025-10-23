import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Team } from '@/integrations/supabase/teams';
import { DollarSign, Target, Users, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from 'react-i18next';
import { useTeamProgress } from '@/integrations/supabase/useTeamProgress';
import { Progress } from '@/components/ui/progress';

interface TeamGoalsCardProps {
  team: Team;
}

const TeamGoalsCard: React.FC<TeamGoalsCardProps> = ({ team }) => {
  const { t } = useTranslation();
  const { data: progress, isLoading: isLoadingProgress } = useTeamProgress(team.id);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };
  
  const calculatePercentage = (current: number, goal: number) => {
    if (goal === 0) return 0;
    return Math.min(100, (current / goal) * 100);
  };
  
  const valueProgress = progress?.total_valor || 0;
  const quantityProgress = progress?.total_quantidade || 0;
  
  const valuePercentage = calculatePercentage(valueProgress, team.meta_mensal_valor);
  const quantityPercentage = calculatePercentage(quantityProgress, team.meta_mensal_quantidade);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          {team.nome}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        
        {isLoadingProgress ? (
          <div className="flex justify-center items-center h-24">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Meta de Valor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  {t('team_meta_value')}
                </div>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(valueProgress)} / {formatCurrency(team.meta_mensal_valor)}
                </span>
              </div>
              <Progress value={valuePercentage} className="h-2" />
              <p className="text-sm font-medium text-right text-muted-foreground">
                {valuePercentage.toFixed(0)}% {t('achieved')}
              </p>
            </div>
            
            <Separator />

            {/* Meta de Quantidade */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {t('team_meta_quantity')}
                </div>
                <span className="text-lg font-bold">
                  {quantityProgress} / {team.meta_mensal_quantidade} {t('units')}
                </span>
              </div>
              <Progress value={quantityPercentage} className="h-2" />
              <p className="text-sm font-medium text-right text-muted-foreground">
                {quantityPercentage.toFixed(0)}% {t('achieved')}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TeamGoalsCard;