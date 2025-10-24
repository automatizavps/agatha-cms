import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardFilter } from "./useDashboardFilter"; // Usando o novo hook

export type DailyServiceCount = {
  hour: number;
  count: number;
};

const fetchDailyServiceCountByHour = async (companyId: string): Promise<DailyServiceCount[]> => {
  const { data, error } = await supabase.rpc('get_daily_service_count_by_hour', {
    company_id_input: companyId,
  });

  if (error) {
    // Logar o erro para debug, mas lançar para o useQuery
    console.error("Erro ao buscar contagem diária de serviços:", error);
    throw new Error(error.message);
  }

  // O resultado do RPC é um array de objetos { hour: number, count: bigint }
  // Convertemos count para number para garantir compatibilidade com o gráfico.
  return data.map(item => ({
    hour: item.hour,
    count: Number(item.count),
  }));
};

export const useDailyServiceCountByHour = () => {
  const { filteredCompanyId, isLoadingFilter } = useDashboardFilter();
  
  // Use a data atual como parte da chave para garantir que os dados sejam atualizados diariamente
  const currentDate = new Date().toISOString().slice(0, 10); 

  const isEnabled = !!filteredCompanyId && !isLoadingFilter;

  return useQuery<DailyServiceCount[], Error>({
    queryKey: ['dailyServiceCountByHour', filteredCompanyId, currentDate],
    queryFn: () => fetchDailyServiceCountByHour(filteredCompanyId!),
    enabled: isEnabled,
  });
};