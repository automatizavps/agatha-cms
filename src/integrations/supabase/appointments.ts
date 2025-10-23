import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";

export interface Appointment {
  id: string;
  empresa_id: string;
  cliente_id: string | null; // Agora usamos o ID do cliente
  responsavel_id: string | null;
  data_hora: string; // ISO string
  status: 'pendente' | 'confirmado' | 'cancelado' | 'concluido';
  created_by: string | null;
  created_at: string;
  // Relacionamentos
  responsavel: {
    nome_completo: string;
  } | null;
  clientes: { // Novo relacionamento para obter o nome do cliente
    nome: string;
  } | null;
}

const fetchAppointments = async (): Promise<Appointment[]> => {
  // Buscamos agendamentos, o nome do responsável e o nome do cliente
  const { data, error } = await supabase
    .from("agendamentos")
    .select(`
      id,
      cliente_id,
      data_hora,
      status,
      responsavel_id,
      responsavel:usuarios!agendamentos_responsavel_id_fkey (nome_completo),
      clientes (nome)
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

interface CreateAppointmentParams {
  cliente_id: string; // Alterado
  responsavel_id: string;
  data_hora: Date;
}

export const createAppointment = async ({ cliente_id, responsavel_id, data_hora }: CreateAppointmentParams) => {
  // 1. Obter o ID da empresa do usuário logado
  const { data: companyData, error: companyError } = await supabase.rpc('get_user_company_id');

  if (companyError || !companyData) {
    console.error("Error fetching user company ID:", companyError);
    throw new Error("Não foi possível determinar a empresa do usuário.");
  }
  
  const empresa_id = companyData;
  
  // 2. Obter o ID do usuário logado (created_by)
  const { data: { user } } = await supabase.auth.getUser();
  const created_by = user?.id;

  if (!created_by) {
    throw new Error("Usuário não autenticado.");
  }

  // 3. Inserir o agendamento
  const { data, error } = await supabase
    .from("agendamentos")
    .insert({
      empresa_id: empresa_id,
      cliente_id: cliente_id, // Usando cliente_id
      responsavel_id: responsavel_id,
      data_hora: data_hora.toISOString(),
      created_by: created_by,
      status: 'pendente', // Padrão
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating appointment:", error);
    throw new Error(error.message);
  }

  return data;
};

interface UpdateAppointmentParams {
  id: string;
  cliente_id: string; // Alterado
  responsavel_id: string;
  data_hora: Date;
  status: Appointment['status'];
}

export const updateAppointment = async ({ id, cliente_id, responsavel_id, data_hora, status }: UpdateAppointmentParams) => {
  const { data, error } = await supabase
    .from("agendamentos")
    .update({
      cliente_id: cliente_id, // Usando cliente_id
      responsavel_id: responsavel_id,
      data_hora: data_hora.toISOString(),
      status: status,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating appointment:", error);
    throw new Error(error.message);
  }

  return data;
};

export const deleteAppointment = async (id: string) => {
  const { error } = await supabase
    .from("agendamentos")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting appointment:", error);
    throw new Error(error.message);
  }
};