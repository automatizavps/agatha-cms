import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";
import { Appointment } from "./appointments";

const fetchLatestAppointments = async (companyId: string | undefined): Promise<Appointment[]> => {
  let query = supabase
    .from("agendamentos")
    .select(`
      id,
      empresa_id,
      cliente_id,
      data_hora,
      status,
      responsavel_id,
      created_at,
      responsavel:usuarios!agendamentos_responsavel_id_fkey (nome_completo, avatar_url),
      clientes (nome, avatar_url),
      empresas (nome),
      agendamento_itens (
        id,
        produto_id,
        produtos (nome)
      )
    `);
    
  if (companyId) {
    query = query.eq('empresa_id', companyId);
  }
    
  const { data, error } = await query
    .order("created_at", { ascending: false }) // Ordena pela data de criação (mais recente primeiro)
    .limit(10); // Limita a 10

  if (error) {
    console.error("Error fetching latest appointments:", error);
    throw new Error("Failed to fetch latest appointments");
  }

  return data as Appointment[];
};

export const useLatestAppointments = (companyId: string | undefined) => {
  return useQuery<Appointment[], Error>({
    queryKey: ["latestAppointments", companyId],
    queryFn: () => fetchLatestAppointments(companyId),
    enabled: true,
  });
};