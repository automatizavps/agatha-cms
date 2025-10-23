import { MadeWithDyad } from "@/components/made-with-dyad";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck, Clock, Users, Loader2, Target, Package, Clock as ServiceIcon } from "lucide-react";
import { useAppointmentMetrics } from "@/integrations/supabase/useAppointmentMetrics";
import { useTeams } from "@/integrations/supabase/teams";
import TeamGoalsCard from "@/components/TeamGoalsCard";
import { useTranslation } from "react-i18next";
import { useProductMetrics } from "@/integrations/supabase/useProductMetrics"; // Importando novo hook

const Index = () => {
  const { metrics: appointmentMetrics, isLoading: isLoadingMetrics } = useAppointmentMetrics();
  const { data: teams, isLoading: isLoadingTeams, isError: isTeamsError } = useTeams();
  const { metrics: productMetrics, isLoading: isLoadingProductMetrics } = useProductMetrics(); // Usando novo hook
  const { t } = useTranslation();

  const isLoading = isLoadingMetrics || isLoadingTeams || isLoadingProductMetrics;

  const renderMetricValue = (value: number, loadingState: boolean) => {
    if (loadingState) {
      return <Loader2 className="h-6 w-6 animate-spin text-primary" />;
    }
    return <div className="text-2xl font-bold">{value}</div>;
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold tracking-tight">{t('dashboard_title')}</h1>
        
        {/* Seção 1: Métricas de Agendamento e Inventário */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          
          {/* Card 1: Total de Agendamentos */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('total_appointments')}</CardTitle>
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {renderMetricValue(appointmentMetrics.totalAppointments, isLoadingMetrics)}
              <p className="text-xs text-muted-foreground">{t('appointments_overview')}</p>
            </CardContent>
          </Card>
          
          {/* Card 2: Agendamentos Confirmados */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('confirmed_appointments')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {renderMetricValue(appointmentMetrics.confirmedAppointments, isLoadingMetrics)}
              <p className="text-xs text-muted-foreground">{t('confirmed_status')}</p>
            </CardContent>
          </Card>
          
          {/* Card 3: Total de Produtos */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('total_products_count')}</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {renderMetricValue(productMetrics.totalProducts, isLoadingProductMetrics)}
              <p className="text-xs text-muted-foreground">{t('total_products_description')}</p>
            </CardContent>
          </Card>
          
          {/* Card 4: Total de Serviços */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('total_services_count')}</CardTitle>
              <ServiceIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {renderMetricValue(productMetrics.totalServices, isLoadingProductMetrics)}
              <p className="text-xs text-muted-foreground">{t('total_services_description')}</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Seção 2: Metas das Equipes */}
        <h2 className="text-2xl font-bold tracking-tight pt-4 flex items-center gap-2">
          <Target className="h-6 w-6 text-muted-foreground" />
          {t('team_goals_section_title')}
        </h2>
        
        {isLoadingTeams ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isTeamsError || !teams || teams.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-muted-foreground">
              {t('no_teams_found')}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <TeamGoalsCard key={team.id} team={team} />
            ))}
          </div>
        )}
        
        <div className="mt-4">
          <MadeWithDyad />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;