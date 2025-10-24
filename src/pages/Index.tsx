import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Users, Clock, Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { BarChart } from '@/components/BarChart';
import { DataTable } from '@/components/DataTable';
import { columns as topSellingColumns } from '@/components/TopSellingColumns';
import { TeamProgressCard } from '@/components/TeamProgressCard';
import { Company } from '@/types/company';
import { UserProfile } from '@/types/user';
import { Team } from '@/types/team';

// Tipos de dados para as estatísticas
interface Stats {
  total_companies: number;
  total_users: number;
  total_orders: number;
  total_appointments: number;
}

interface DailyData {
  hour: number;
  count: number;
}

interface TopSellingItem {
  produto_id: string;
  nome_produto: string;
  tipo_produto: 'produto' | 'servico';
  total_vendido: number;
}

// --- Hooks de Dados ---

// Hook para buscar estatísticas gerais (apenas Super Admin)
const useGeneralStats = () => {
  return useQuery<Stats>({
    queryKey: ['generalStats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_general_stats');
      if (error) throw error;
      return data[0] || { total_companies: 0, total_users: 0, total_orders: 0, total_appointments: 0 };
    },
    enabled: false, // Desabilitado por padrão, só Super Admin usa
  });
};

// Hook para buscar dados diários por hora (Pedidos)
const useDailyOrderData = (companyId: string | null) => {
  return useQuery<DailyData[]>({
    queryKey: ['dailyOrderData', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase.rpc('get_daily_order_count_by_hour', { company_id_input: companyId });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
};

// Hook para buscar dados diários por hora (Agendamentos)
const useDailyServiceData = (companyId: string | null) => {
  return useQuery<DailyData[]>({
    queryKey: ['dailyServiceData', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase.rpc('get_daily_service_count_by_hour', { company_id_input: companyId });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
};

// Hook para buscar Itens Mais Vendidos
const useTopSellingItems = (companyId: string | null) => {
  return useQuery<TopSellingItem[]>({
    queryKey: ['topSellingItems', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase.rpc('get_top_selling_items', { company_id_input: companyId });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
};

// Hook para buscar todas as empresas (Super Admin)
const useAllCompanies = (isSuperAdmin: boolean) => {
  return useQuery<Company[]>({
    queryKey: ['allCompanies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('empresas').select('*');
      if (error) throw error;
      return data || [];
    },
    enabled: isSuperAdmin,
  });
};

// Hook para buscar equipes da empresa
const useCompanyTeams = (companyId: string | null) => {
  return useQuery<Team[]>({
    queryKey: ['companyTeams', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase.from('equipes').select('*').eq('empresa_id', companyId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });
};


const IndexPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const isSuperAdmin = profile?.perfil_id === 1;
  const userCompanyId = profile?.empresa_id;

  // Estado para a empresa selecionada (Super Admin)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    isSuperAdmin ? null : userCompanyId || null
  );

  // Atualiza o ID da empresa selecionada quando o perfil carrega
  useEffect(() => {
    if (!isSuperAdmin && userCompanyId) {
      setSelectedCompanyId(userCompanyId);
    }
  }, [isSuperAdmin, userCompanyId]);

  // Dados para Super Admin
  const { data: generalStats, isLoading: isLoadingGeneralStats } = useGeneralStats();
  const { data: allCompanies, isLoading: isLoadingCompanies } = useAllCompanies(isSuperAdmin);

  // Dados para a empresa selecionada
  const companyIdToFetch = isSuperAdmin ? selectedCompanyId : userCompanyId;

  const { data: dailyOrderData, isLoading: isLoadingDailyOrders } = useDailyOrderData(companyIdToFetch);
  const { data: dailyServiceData, isLoading: isLoadingDailyServices } = useDailyServiceData(companyIdToFetch);
  const { data: topSellingItems, isLoading: isLoadingTopSelling } = useTopSellingItems(companyIdToFetch);
  const { data: companyTeams, isLoading: isLoadingTeams } = useCompanyTeams(companyIdToFetch);

  // Função para formatar dados para o BarChart
  const formatChartData = (orderData: DailyData[] = [], serviceData: DailyData[] = []) => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    return hours.map(hour => {
      const orderCount = orderData.find(d => d.hour === hour)?.count || 0;
      const serviceCount = serviceData.find(d => d.hour === hour)?.count || 0;
      
      return {
        hour: `${hour}:00`,
        [t('orders')]: orderCount,
        [t('services')]: serviceCount,
      };
    });
  };

  const chartData = formatChartData(dailyOrderData, dailyServiceData);

  // Renderização de Cartões de Estatísticas
  const renderStatsCards = () => {
    if (isSuperAdmin) {
      if (isLoadingGeneralStats) {
        return Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-[120px] w-full" />);
      }
      
      return (
        <>
          <StatCard 
            title={t('total_companies')} 
            value={generalStats?.total_companies || 0} 
            icon={Package} 
          />
          <StatCard 
            title={t('total_users')} 
            value={generalStats?.total_users || 0} 
            icon={Users} 
          />
          <StatCard 
            title={t('total_orders')} 
            value={generalStats?.total_orders || 0} 
            icon={DollarSign} 
          />
          <StatCard 
            title={t('total_appointments')} 
            value={generalStats?.total_appointments || 0} 
            icon={Clock} 
          />
        </>
      );
    }
    
    // Se não for Super Admin, ou se uma empresa estiver selecionada, mostramos dados específicos da empresa
    // Por enquanto, mantemos placeholders ou dados de exemplo, pois não temos RPCs de estatísticas de empresa
    return (
      <>
        <StatCard 
          title={t('daily_orders')} 
          value={dailyOrderData?.reduce((sum, item) => sum + item.count, 0) || 0} 
          icon={DollarSign} 
        />
        <StatCard 
          title={t('daily_services')} 
          value={dailyServiceData?.reduce((sum, item) => sum + item.count, 0) || 0} 
          icon={Clock} 
        />
        <StatCard 
          title={t('active_users')} 
          value={15} // Placeholder
          icon={Users} 
        />
        <StatCard 
          title={t('low_stock_alerts')} 
          value={3} // Placeholder
          icon={Package} 
        />
      </>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6">
        {/* Título: text-2xl no mobile, lg:text-3xl no desktop */}
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{t('dashboard_title')}</h1> 
        
        {/* Filtro de Empresa (Apenas Super Admin) */}
        {isSuperAdmin && (
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">{t('select_company')}:</label>
            <Select
              value={selectedCompanyId || ''}
              onValueChange={(value) => setSelectedCompanyId(value === 'all' ? null : value)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t('select_company_placeholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_companies')}</SelectItem>
                {isLoadingCompanies ? (
                  <SelectItem value="loading" disabled>
                    {t('loading')}...
                  </SelectItem>
                ) : (
                  allCompanies?.map(company => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.nome}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {renderStatsCards()}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Gráfico de Vendas/Serviços Diários */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('daily_activity')}</CardTitle>
          </CardHeader>
          <CardContent>
            {(isLoadingDailyOrders || isLoadingDailyServices) ? (
              <Skeleton className="h-[350px] w-full" />
            ) : (
              <BarChart 
                data={chartData} 
                keys={[t('orders'), t('services')]} 
                index="hour"
                className="h-[350px]"
              />
            )}
          </CardContent>
        </Card>

        {/* Progresso da Equipe (Apenas se houver equipes e não for Super Admin sem empresa selecionada) */}
        {companyTeams && companyTeams.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{t('team_progress')}</h2>
            {companyTeams.map(team => (
              <TeamProgressCard key={team.id} team={team} />
            ))}
          </div>
        )}
        
        {/* Itens Mais Vendidos */}
        <Card className={companyTeams && companyTeams.length > 0 ? "lg:col-span-3" : "lg:col-span-1"}>
          <CardHeader>
            <CardTitle>{t('top_selling_items')}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingTopSelling ? (
              <Skeleton className="h-[350px] w-full" />
            ) : (
              <DataTable 
                columns={topSellingColumns(t)} 
                data={topSellingItems || []} 
                pageSize={5}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default IndexPage;

// Componente auxiliar para os cartões de estatísticas
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {/* <p className="text-xs text-muted-foreground">+20.1% from last month</p> */}
    </CardContent>
  </Card>
);