import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardFilter } from "./useDashboardFilter";

export type TimeSeriesCount = {
  time_unit: number | string; // Pode ser hora (number) ou data (string)
  count: number;
};

// Função para buscar dados por HORA (apenas para o dia atual)
const fetchDailyServiceCountByHour = async (companyId: string): Promise<TimeSeriesCount[]> => {
  const { data, error } = await supabase.rpc('get_daily_service_count_by_hour', {
    company_id_input: companyId,
  });

  if (error) {
    console.error("Erro ao buscar contagem diária de serviços (por hora):", error);
    throw new Error(error.message);
  }

  return data.map(item => ({
    time_unit: item.hour,
    count: Number(item.count),
  }));
};

// Função para buscar dados por DIA (para um período)
const fetchServiceCountByDay = async (companyId: string, startDate: Date, endDate: Date): Promise<TimeSeriesCount[]> => {
  // Usamos a tabela agendamentos diretamente para agregar por dia
  let query = supabase
    .from("agendamentos")
    .select("data_hora, id")
    .eq("empresa_id", companyId)
    .eq("status", "concluido")
    .gte("data_hora", startDate.toISOString());
    
  // Adiciona 1 dia ao endDate para incluir o dia inteiro
  const end = new Date(endDate);
  end.setDate(end.getDate() + 1);
  query = query.lt("data_hora", end.toISOString());

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao buscar contagem de serviços (por dia):", error);
    throw new Error(error.message);
  }
  
  // Agrupar por dia
  const dailyCounts = data.reduce((acc, item) => {
    // Formata a data para YYYY-MM-DD
    const dateKey = item.data_hora.slice(0, 10);
    acc[dateKey] = (acc[dateKey] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Converte para o formato TimeSeriesCount
  return Object.entries(dailyCounts).map(([date, count]) => ({
    time_unit: date,
    count: count,
  })).sort((a, b) => a.time_unit.localeCompare(b.time_unit));
};


export const useServiceTimeSeries = (startDate?: Date, endDate?: Date) => {
  const { filteredCompanyId, isLoadingFilter } = useDashboardFilter();
  
  // Verifica se o filtro está ativo E se é um intervalo de mais de um dia
  const isSingleDay = !!startDate && !!endDate && startDate.toDateString() === endDate.toDateString();
  const isPeriodFilterActive = !!startDate && !!endDate && !isSingleDay;
  
  // A chave da query depende do modo (hora ou período)
  const queryKey = isPeriodFilterActive 
    ? ['serviceTimeSeries', filteredCompanyId, startDate.toISOString(), endDate.toISOString()]
    : ['dailyServiceCountByHour', filteredCompanyId, isSingleDay ? startDate.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)];

  const isEnabled = !!filteredCompanyId && !isLoadingFilter;

  return useQuery<TimeSeriesCount[], Error>({
    queryKey: queryKey,
    queryFn: () => {
      // Se for um período de mais de um dia, usamos a agregação por dia
      if (isPeriodFilterActive) {
        return fetchServiceCountByDay(filteredCompanyId!, startDate, endDate);
      }
      // Se for um único dia (selecionado ou hoje), usamos a RPC por hora
      return fetchDailyServiceCountByHour(filteredCompanyId!);
    },
    enabled: isEnabled,
  });
};