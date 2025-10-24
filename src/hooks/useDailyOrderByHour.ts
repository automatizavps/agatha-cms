import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardFilter } from "./useDashboardFilter";

export type DailyOrderCount = {
  hour: number;
  count: number;
};

const fetchDailyOrderCountByHour = async (companyId: string): Promise<DailyOrderCount[]> => {
  const { data, error } = await supabase.rpc('get_daily_order_count_by_hour', {
    company_id_input: companyId,
  });

  if (error) {
    console.error("Erro ao buscar contagem diária de pedidos:", error);
    throw new Error(error.message);
  }

  return data.map(item => ({
    hour: item.hour,
    count: Number(item.count),
  }));
};

export const useDailyOrderByHour = () => {
  const { filteredCompanyId, isLoadingFilter } = useDashboardFilter();
  
  // Use a data atual como parte da chave para garantir que os dados sejam atualizados diariamente
  const currentDate = new Date().toISOString().slice(0, 10); 

  // Habilitado apenas se houver um ID de empresa (a RPC exige)
  const isEnabled = !!filteredCompanyId && !isLoadingFilter;

  return useQuery<DailyOrderCount[], Error>({
    queryKey: ['dailyOrderCountByHour', filteredCompanyId, currentDate],
    queryFn: () => fetchDailyOrderCountByHour(filteredCompanyId!),
    enabled: isEnabled,
    refetchOnWindowFocus: true, 
    staleTime: 1000 * 60 * 5, // 5 minutos de validade
  });
};