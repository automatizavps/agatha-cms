import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck, Clock, Users, Loader2, Target, DollarSign, Package, Building, ListOrdered, ShoppingCart } from "lucide-react";
import { useAppointmentMetrics } from "@/integrations/supabase/useAppointmentMetrics";
import { useTeams } from "@/integrations/supabase/teams";
import TeamGoalsCard from "@/components/TeamGoalsCard";
import { useTranslation } from "react-i18next";
import { useRevenueMetrics, useProductCount, useClientCount } from "@/integrations/supabase/dashboardMetrics";
import { useCompanies } from "@/integrations/supabase/companies";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import LatestProductsCarousel from "@/components/LatestProductsCarousel";
import TopSellingItemsCard from "@/components/TopSellingItemsCard";
import TopSellingServicesCard from "@/components/TopSellingServicesCard";
import DailyServiceByHourChart from "@/components/DailyServiceByHourChart";
import AppointmentStatusChart from "@/components/AppointmentStatusChart";
import DailyOrderByHourChart from "@/components/DailyOrderByHourChart"; // NOVO
import OrderStatusChart from "@/components/OrderStatusChart"; // NOVO
import { useDashboardFilter } from "@/hooks/useDashboardFilter";

const Index = () => {
  const { t } = useTranslation();
  
  const { 
    isSuperAdmin, 
    selectedCompanyId, 
    setSelectedCompanyId, 
    filteredCompanyId, 
    isLoadingFilter 
  } = useDashboardFilter();
  
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
  
  // Agora, useAppointmentMetrics também aceita undefined
  const { metrics, isLoading: isLoadingMetrics } = useAppointmentMetrics(filteredCompanyId);
  
  // useRevenueMetrics agora aceita undefined
  const { data: revenueMetrics, isLoading: isLoadingRevenue } = useRevenueMetrics(filteredCompanyId);
  const { data: productCount, isLoading: isLoadingProductCount } = useProductCount(filteredCompanyId);
  const { data: clientCount, isLoading: isLoadingClientCount } = useClientCount(filteredCompanyId); 
  
  // useTeams agora aceita undefined
  const { data: teams, isLoading: isLoadingTeams, isError: isTeamsError } = useTeams(filteredCompanyId);

  const isLoading = isLoadingMetrics || isLoadingTeams || isLoadingRevenue || isLoadingProductCount || isLoadingFilter || isLoadingClientCount;
  
  // A métrica de equipes é desabilitada se for 'Todas as Empresas' (pois a RPC de progresso exige ID)
  const isTeamsDisabled = isSuperAdmin && selectedCompanyId === 'all';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const renderMetricValue = (value: number | string, isCurrency: boolean = false) => {
    if (isLoading) {
      return <Loader2 className="h-6 w-6 animate-spin text-primary" />;
    }
    // Não precisamos mais verificar isMetricsDisabled aqui, pois os hooks agora lidam com a agregação.
    if (isCurrency) {
      return <div className="text-xl font-bold">{formatCurrency(value as number)}</div>;
    }
    return <div className="text-xl font-bold">{value}</div>;
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        {/* Ajustado para text-2xl no mobile e text-2xl no desktop */}
        <h1 className="text-2xl lg:text-2xl font-bold tracking-tight">{t('dashboard_title')}</h1>
        
        {/* Filtro de Empresa (Apenas Super Admin) */}
        {isSuperAdmin && (
          <div className="w-full md:w-64">
            <Select 
              onValueChange={setSelectedCompanyId} 
              value={selectedCompanyId} 
              disabled={isLoadingCompanies || isLoadingFilter}
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
        
        {/* Seção 1: Métricas de Agendamento e Faturamento */}
        <div className="flex flex-col gap-4">
          
          {/* Linha 1: 4 Colunas (Faturamento) */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            
            {/* Card 1: Faturamento Diário - DESTAQUE APLICADO AQUI */}
            <Card className={cn("border-primary/50 bg-primary/10 dark:bg-primary/20")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('daily_revenue')}</CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                {renderMetricValue(revenueMetrics?.daily_revenue || 0, true)}
                <p className="text-xs text-muted-foreground">Pedidos e Serviços concluídos hoje</p>
              </CardContent>
            </Card>
            
            {/* Card 2: Faturamento Semanal */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('weekly_revenue')}</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {renderMetricValue(revenueMetrics?.weekly_revenue || 0, true)}
                <p className="text-xs text-muted-foreground">Pedidos e Serviços concluídos esta semana</p>
              </CardContent>
            </Card>
            
            {/* Card 3: Faturamento Mensal */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('monthly_revenue')}</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {renderMetricValue(revenueMetrics?.monthly_revenue || 0, true)}
                <p className="text-xs text-muted-foreground">Pedidos e Serviços concluídos este mês</p>
              </CardContent>
            </Card>
            
            {/* Card 4: Total de Agendamentos */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('total_appointments')}</CardTitle>
                <CalendarCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {renderMetricValue(metrics.totalAppointments)}
                <p className="text-xs text-muted-foreground">Agendamentos para hoje</p>
              </CardContent>
            </Card>
          </div>
          
          {/* Linha 2: 3 Colunas (Contagens) */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
            
            {/* Card 5: Agendamentos Pendentes */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('pending_appointments')}</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {renderMetricValue(metrics.pendingAppointments)}
                <p className="text-xs text-muted-foreground">Pendentes para hoje</p>
              </CardContent>
            </Card>
            
            {/* Card 6: Total de Produtos */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('total_products')}</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {renderMetricValue(productCount || 0)}
                <p className="text-xs text-muted-foreground">{t('total_products_overview')}</p>
              </CardContent>
            </Card>
            
            {/* Card 7: Total de Clientes */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('total_clients')}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {renderMetricValue(clientCount || 0)}
                <p className="text-xs text-muted-foreground">{t('total_clients_overview')}</p>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Seção 2: Metas das Equipes */}
        {/* Exibe metas apenas se uma empresa específica estiver selecionada */}
        {!isTeamsDisabled && filteredCompanyId && (
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
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
          </div>
        )}
        
        {/* Placeholder para Metas de Equipe quando 'Todas as Empresas' está selecionado */}
        {isTeamsDisabled && (
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Target className="h-6 w-6 text-muted-foreground" />
              {t('team_goals_section_title')}
            </h2>
            <Card>
              <CardContent className="p-4 text-muted-foreground">
                {t("select_company_for_metrics")}
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Seção 3: Gráficos de Agendamentos */}
        <div className="grid gap-6 grid-cols-12">
          {/* Gráfico de Serviços por Hora (Linha) */}
          <div className="col-span-12 md:col-span-6 lg:col-span-8">
            <DailyServiceByHourChart />
          </div>
          
          {/* Gráfico de Status de Agendamentos (Barra) */}
          <div className="col-span-12 md:col-span-6 lg:col-span-4">
            <AppointmentStatusChart />
          </div>
        </div>
        
        {/* Seção 4: Gráficos de Pedidos */}
        <div className="grid gap-6 grid-cols-12">
          {/* Gráfico de Pedidos Entregues por Hora (Linha) */}
          <div className="col-span-12 md:col-span-6 lg:col-span-8">
            <DailyOrderByHourChart />
          </div>
          
          {/* Gráfico de Status dos Pedidos (Barra) */}
          <div className="col-span-12 md:col-span-6 lg:col-span-4">
            <OrderStatusChart />
          </div>
        </div>
        
        {/* Seção 5: Últimos Produtos Cadastrados (Carousel) */}
        <LatestProductsCarousel companyId={filteredCompanyId} />
        
        {/* Seção 6: Top 10 Produtos e Serviços Mais Vendidos */}
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
          <TopSellingItemsCard companyId={filteredCompanyId} />
          <TopSellingServicesCard companyId={filteredCompanyId} />
        </div>
        
      </div>
    </DashboardLayout>
  );
};

export default Index;