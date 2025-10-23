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

export const useDailyServiceCountByHour = (companyIdOverride?: string | 'all') => {
  const { companyId: userCompanyId, isLoading: isLoadingCompany, isSuperAdmin } = useUserCompany();
  
  // 1. Determinar o ID da empresa a ser usado
  let finalCompanyId: string | undefined;

  if (isSuperAdmin && companyIdOverride && companyIdOverride !== 'all') {
    // Super Admin selecionou uma empresa específica
    finalCompanyId = companyIdOverride;
  } else if (!isSuperAdmin || (isSuperAdmin && companyIdOverride === 'all')) {
    // Usuário normal OU Super Admin com 'all' selecionado.
    // Se for Super Admin com 'all', não podemos chamar a RPC, então usamos undefined.
    // Se for usuário normal, usamos o ID da empresa dele.
    finalCompanyId = isSuperAdmin && companyIdOverride === 'all' ? undefined : userCompanyId;
  } else {
    finalCompanyId = userCompanyId;
  }
    
  // Use a data atual como parte da chave para garantir que os dados sejam atualizados diariamente
  const currentDate = new Date().toISOString().slice(0, 10); 

  const isEnabled = !!finalCompanyId && !isLoadingCompany;

  return useQuery<DailyServiceCount[], Error>({
    queryKey: ['dailyServiceCountByHour', finalCompanyId, currentDate],
    queryFn: () => fetchDailyServiceCountByHour(finalCompanyId!),
    enabled: isEnabled,
  });
};