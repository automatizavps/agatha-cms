import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";

export interface TeamProgress {
  total_valor: number;
  total_quantidade: number;
}

const fetchTeamProgress = async (teamId: string): Promise<TeamProgress> => {
  // Usamos a função RPC criada no banco de dados
  const { data, error } = await supabase.rpc('get_team_monthly_progress', { team_id_input: teamId });

  if (error) {
    console.error("Error fetching team progress:", error);
    throw new Error("Failed to fetch team progress: " + error.message);
  }
  
  // A função retorna uma tabela com uma única linha
  const result = data?.[0];

  if (!result) {
    return { total_valor: 0, total_quantidade: 0 };
  }

  return {
    total_valor: parseFloat(result.total_valor) || 0,
    total_quantidade: parseInt(result.total_quantidade) || 0,
  };
};

export const useTeamProgress = (teamId: string) => {
  // A queryKey inclui o mês atual para garantir que os dados sejam atualizados mensalmente
  const currentMonth = new Date().toISOString().slice(0, 7); 
  
  return useQuery<TeamProgress, Error>({
    queryKey: ["teamProgress", teamId, currentMonth],
    queryFn: () => fetchTeamProgress(teamId),
    enabled: !!teamId,
  });
};