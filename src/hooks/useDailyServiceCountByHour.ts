import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserCompany } from "./useUserCompany";

export type DailyServiceCount = {
  hour: number;
  count: number;
};

const fetchDailyServiceCountByHour = async (companyId: string): Promise<DailyServiceCount[]> => {
  const { data, error } = await supabase.rpc('get_daily_service_count_by_hour', {
    company_id_input: companyId,
  });

  if (error) {
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
  const { companyId, isLoading: isLoadingCompany } = useUserCompany();

  return useQuery<DailyServiceCount[], Error>({
    queryKey: ['dailyServiceCountByHour', companyId],
    queryFn: () => fetchDailyServiceCountByHour(companyId!),
    enabled: !!companyId && !isLoadingCompany,
  });
};