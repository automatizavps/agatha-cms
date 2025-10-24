import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardFilter } from "./useDashboardFilter";

export type TimeSeriesCount = {
  time_unit: number | string; // Pode ser hora (number) ou data (string)
  count: number;
};

// Função para buscar dados por HORA (apenas para o dia atual)
const fetchDailyOrderCountByHour = async (companyId: string): Promise<TimeSeriesCount[]> => {
  const { data, error } = await supabase.rpc('get_daily_order_count_by_hour', {
    company_id_input: companyId,
  });

  if (error) {
    console.error("Erro ao buscar contagem diária de pedidos (por hora):", error);
    throw new Error(error.message);
  }

  return data.map(item => ({
    hour: item.hour,
    count: Number(item.count),
  }));
};

// Função para buscar dados por DIA (para um período)
const fetchOrderCountByDay = async (companyId: string, startDate: Date, endDate: Date): Promise<TimeSeriesCount[]> => {
  // Usamos a tabela pedidos diretamente para agregar por dia
  let query = supabase
    .from("pedidos")
    .select("created_at, id")
    .eq("empresa_id", companyId)
    .eq("status", "entregue")
    .gte("created_at", startDate.toISOString());
    
  // Adiciona 1 dia ao endDate para incluir o dia inteiro
  const end = new Date(endDate);
  end.setDate(end.getDate() + 1);
  query = query.lt("created_at", end.toISOString());

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao buscar contagem de pedidos (por dia):", error);
    throw new Error(error.message);
  }
  
  // Agrupar por dia
  const dailyCounts = data.reduce((acc, item) => {
    // Formata a data para YYYY-MM-DD
    const dateKey = item.created_at.slice(0, 10);
    acc[dateKey] = (acc[dateKey] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Converte para o formato TimeSeriesCount
  return Object.entries(dailyCounts).map(([date, count]) => ({
    time_unit: date,
    count: count,
  })).sort((a, b) => a.time_unit.localeCompare(b.time_unit));
};


export const useOrderTimeSeries = (startDate?: Date, endDate?: Date) => {
  const { filteredCompanyId, isLoadingFilter } = useDashboardFilter();
  
  const isPeriodFilterActive = !!startDate && !!endDate;
  
  // A chave da query depende do modo (hora ou período)
  const queryKey = isPeriodFilterActive 
    ? ['orderTimeSeries', filteredCompanyId, startDate.toISOString(), endDate.toISOString()]
    : ['dailyOrderCountByHour', filteredCompanyId, new Date().toISOString().slice(0, 10)];

  const isEnabled = !!filteredCompanyId && !isLoadingFilter;

  return useQuery<TimeSeriesCount[], Error>({
    queryKey: queryKey,
    queryFn: () => {
      if (isPeriodFilterActive) {
        return fetchOrderCountByDay(filteredCompanyId!, startDate, endDate);
      }
      return fetchDailyOrderCountByHour(filteredCompanyId!);
    },
    enabled: isEnabled,
    refetchOnWindowFocus: true, 
    staleTime: 1000 * 60 * 5, // 5 minutos de validade
  });
};