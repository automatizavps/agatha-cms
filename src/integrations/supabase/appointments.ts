import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";

export interface Appointment {
  id: string;
  empresa_id: string;
  cliente_nome: string;
  responsavel_id: string | null;
  data_hora: string; // ISO string
  status: 'pendente' | 'confirmado' | 'cancelado' | 'concluido';
  created_by: string | null;
  created_at: string;
  // Relacionamentos (se necessário, vamos buscar o nome do responsável)
  responsavel: {
    nome_completo: string;
  } | null;
}

const fetchAppointments = async (): Promise<Appointment[]> => {
  // Buscamos agendamentos e o nome do responsável (responsavel_id -> usuarios)
  const { data, error } = await supabase
    .from("agendamentos")
    .select(`
      id,
      cliente_nome,
      data_hora,
      status,
      responsavel_id,
      responsavel:usuarios (nome_completo)
    `)
    .order("data_hora", { ascending: true });

  if (error) {
    console.error("Error fetching appointments:", error);
    throw new Error("Failed to fetch appointments");
  }

  return data as Appointment[];
};

export const useAppointments = () => {
  return useQuery<Appointment[], Error>({
    queryKey: ["appointments"],
    queryFn: fetchAppointments,
  });
};