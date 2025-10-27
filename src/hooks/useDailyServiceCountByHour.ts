import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardFilter } from "./useDashboardFilter"; // Usando o novo hook

export type DailyServiceCount = {
  hour: number;
  count: number;
};

const fetchDailyServiceCountByHour = async (companyId: string | undefined, targetDate: string | undefined): Promise<DailyServiceCount[]> => {
  let rpcName = 'get_daily_service_count_by_hour';
  let rpcArgs: Record<string, any> = {};
  
  if (companyId) {
    rpcArgs = { company_id_input: companyId };
  } else {
    // Se companyId for undefined, usamos a versão ALL
    rpcName = 'get_daily_service_count_by_hour_all';
  }
  
  // Adiciona a data alvo se fornecida
  if (targetDate) {
    rpcArgs.target_date = targetDate;
  }
  
  const { data, error } = await supabase.rpc(rpcName, rpcArgs);

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

export const useDailyServiceCountByHour = (targetDate?: string) => {
  const { filteredCompanyId, isLoadingFilter } = useDashboardFilter();
  
  // Use a data alvo como parte da chave para garantir que os dados sejam atualizados
  const queryDateKey = targetDate || new Date().toISOString().slice(0, 10); 

  const isEnabled = !isLoadingFilter;

  return useQuery<DailyServiceCount[], Error>({
    queryKey: ['dailyServiceCountByHour', filteredCompanyId, queryDateKey],
    queryFn: () => fetchDailyServiceCountByHour(filteredCompanyId, targetDate),
    enabled: isEnabled,
  });
};