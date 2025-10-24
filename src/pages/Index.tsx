import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck, Clock, Users, Loader2, Target, DollarSign, Package, Building, ShoppingCart, CalendarIcon } from "lucide-react";
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
import DailyOrderByHourChart from "@/components/DailyOrderByHourChart";
import OrderStatusChart from "@/components/OrderStatusChart";
import { useDashboardFilter } from "@/hooks/useDashboardFilter";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";

// Função auxiliar para obter a data de hoje com a hora zerada
const getToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const Index = () => {
  const { t } = useTranslation();
  
  const { 
    isSuperAdmin, 
    selectedCompanyId, 
    setSelectedCompanyId, 
    filteredCompanyId, 
    isLoadingFilter 
  } = useDashboardFilter();
  
  // Agora usamos apenas 'selectedDate' para o filtro de dia
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
  
  // Calculamos startDate e endDate com base em selectedDate
  const startDate = selectedDate;
  const endDate = selectedDate;
  
  // Passando o filtro de data para as métricas
  const { metrics, isLoading: isLoadingMetrics } = useAppointmentMetrics(filteredCompanyId, startDate, endDate);
  
  const { data: revenueMetrics, isLoading: isLoadingRevenue } = useRevenueMetrics(filteredCompanyId, startDate, endDate);
  const { data: productCount, isLoading: isLoadingProductCount } = useProductCount(filteredCompanyId);
  const { data: clientCount, isLoading: isLoadingClientCount } = useClientCount(filteredCompanyId);
  
  // As equipes são filtradas apenas por empresa, pois a meta é mensal (não arbitrária)
  const { data: teams, isLoading: isLoadingTeams, isError: isTeamsError } = useTeams(filteredCompanyId);

  const isLoading = isLoadingMetrics || isLoadingTeams || isLoadingRevenue || isLoadingProductCount || isLoadingFilter || isLoadingClientCount;

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
    if (isCurrency) {
      return <div className="text-xl font-bold">{formatCurrency(value as number)}</div>;
    }
    return <div className="text-xl font-bold">{value}</div>;
  };
  
  // Verifica se há um filtro de data ativo
  const isDateFilterActive = !!selectedDate;
  
  // Texto para o filtro de data
  const dateFilterText = selectedDate 
    ? format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })
    : t('select_date'); // Usando 'select_date' para indicar que é uma única data

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold tracking-tight">{t('dashboard_title')}</h1>
        
        {/* Filtros de Empresa e Período */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          
          {/* Filtro de Empresa (Apenas Super Admin) */}
          {isSuperAdmin && (
            <div className="w-full md:w-64">
              <Select 
                onValueChange={setSelectedCompanyId} 
                value={selectedCompanyId} 
                disabled={isLoadingCompanies || isLoading}
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
          
          {/* Filtro de Período (Agora Single Date) */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full md:w-64 justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
                disabled={isLoading}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                <span>{dateFilterText}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single" // Alterado para modo single
                selected={selectedDate}
                onSelect={(date) => {
                  // Ao selecionar uma data, definimos o estado
                  setSelectedDate(date);
                }}
                locale={ptBR}
              />
              <div className="p-2 border-t">
                <Button 
                  variant="ghost" 
                  className="w-full" 
                  onClick={() => { setSelectedDate(undefined); }}
                >
                  {t('clear_filter')}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Aviso sobre o filtro de data */}
        {isDateFilterActive && (
          <div className="p-3 bg-blue-100/50 dark:bg-blue-900/20 border border-blue-400/50 rounded-md text-sm text-blue-800 dark:text-blue-300">
            {t('dashboard_date_filter_warning')}
          </div>
        )}
        
        {/* Seção 1: Métricas de Agendamento e Faturamento */}
        {/* Ajustado para 3 colunas no md e 4 colunas no lg para melhor distribuição de 7 itens */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          
          {/* Card 1: Faturamento Total - DESTAQUE APLICADO AQUI */}
          <Card className={cn("border-primary/50 bg-primary/10 dark:bg-primary/20 col-span-2 md:col-span-3 lg:col-span-2")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('report_total_revenue')}</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {renderMetricValue(revenueMetrics?.total_revenue || 0, true)}
              <p className="text-xs text-muted-foreground">{isDateFilterActive ? t('total_revenue_period') : t('total_revenue_all_time')}</p>
            </CardContent>
          </Card>
          
          {/* Card 2: Total de Pedidos */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('total_orders')}</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {renderMetricValue(revenueMetrics?.total_orders || 0)}
              <p className="text-xs text-muted-foreground">{isDateFilterActive ? t('total_orders_period') : t('total_orders_all_time')}</p>
            </CardContent>
          </Card>
          
          {/* Card 3: Total de Agendamentos */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('total_appointments')}</CardTitle>
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {renderMetricValue(metrics.totalAppointments)}
              <p className="text-xs text-muted-foreground">{isDateFilterActive ? t('total_appointments_period') : t('total_appointments_all_time')}</p>
            </CardContent>
          </Card>
          
          {/* Card 4: Agendamentos Pendentes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('pending_appointments')}</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {renderMetricValue(metrics.pendingAppointments)}
              <p className="text-xs text-muted-foreground">{isDateFilterActive ? t('pending_appointments_period') : t('pending_appointments_all_time')}</p>
            </CardContent>
          </Card>
          
          {/* Card 5: Total de Produtos */}
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
          
          {/* Card 6: Total de Clientes */}
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
        
        {/* Seção 2: Metas das Equipes */}
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
        
        {/* Seção 3: Gráficos de Agendamentos (Série Temporal e Status) */}
        <div className="grid gap-6 grid-cols-12">
          <div className="col-span-12 md:col-span-6 lg:col-span-8">
            {/* Passando os filtros de data para o gráfico de série temporal */}
            <DailyServiceByHourChart startDate={startDate} endDate={endDate} />
          </div>
          
          <div className="col-span-12 md:col-span-6 lg:col-span-4">
            {/* Passando os filtros de data para o gráfico de status */}
            <AppointmentStatusChart startDate={startDate} endDate={endDate} />
          </div>
        </div>
        
        {/* Seção 4: Gráficos de Pedidos (Série Temporal e Status) */}
        <div className="grid gap-6 grid-cols-12">
          <div className="col-span-12 md:col-span-6 lg:col-span-8">
            {/* Passando os filtros de data para o gráfico de série temporal */}
            <DailyOrderByHourChart startDate={startDate} endDate={endDate} />
          </div>
          
          <div className="col-span-12 md:col-span-6 lg:col-span-4">
            {/* Passando os filtros de data para o gráfico de status */}
            <OrderStatusChart startDate={startDate} endDate={endDate} />
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