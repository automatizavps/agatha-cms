import { useQuery, useQueryClient, QueryClient } from "@tanstack/react-query";
import { supabase } from "./client";
import { createNotification } from "./notifications"; // Importando

export interface AppointmentItem {
  id: string;
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
  // Relacionamento com o produto para obter o nome e tipo
  produtos: {
    nome: string;
    tipo: 'produto' | 'servico';
  } | null;
}

export interface Appointment {
  id: string;
  empresa_id: string;
  cliente_id: string | null;
  responsavel_id: string | null;
  data_hora: string; // ISO string
  status: 'pendente' | 'confirmado' | 'cancelado' | 'concluido';
  created_by: string | null;
  created_at: string;
  // Relacionamentos
  responsavel: {
    nome_completo: string;
  } | null;
  clientes: {
    nome: string;
  } | null;
  empresas: { // NOVO: Adicionando relacionamento com a empresa
    nome: string;
  } | null;
  // Novo relacionamento para itens
  agendamento_itens: AppointmentItem[];
}

// --- Fetch Geral ---

const fetchAppointments = async (companyId?: string): Promise<Appointment[]> => {
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
      responsavel:usuarios!agendamentos_responsavel_id_fkey (nome_completo),
      clientes (nome),
      empresas (nome)
    `);
    
  // Se companyId for fornecido, filtramos. Se for undefined (Todas as Empresas), não filtramos.
  if (companyId) {
    query = query.eq('empresa_id', companyId);
  }

  const { data, error } = await query.order("data_hora", { ascending: true });

  if (error) {
    console.error("Error fetching appointments:", error);
    throw new Error("Failed to fetch appointments");
  }

  return data as Appointment[];
};

export const useAppointments = (companyId?: string) => {
  return useQuery<Appointment[], Error>({
    queryKey: ["appointments", companyId],
    queryFn: () => fetchAppointments(companyId),
  });
};

// --- Fetch Appointment Items ---

const fetchAppointmentItems = async (appointmentId: string): Promise<AppointmentItem[]> => {
  const { data, error } = await supabase
    .from("agendamento_itens")
    .select(`
      id,
      produto_id,
      quantidade,
      preco_unitario,
      produtos (nome, tipo)
    `)
    .eq('agendamento_id', appointmentId);

  if (error) {
    console.error("Error fetching appointment items:", error);
    throw new Error("Failed to fetch appointment items");
  }

  return data as AppointmentItem[];
};

export const useAppointmentItems = (appointmentId: string) => {
  return useQuery<AppointmentItem[], Error>({
    queryKey: ["appointmentItems", appointmentId],
    queryFn: () => fetchAppointmentItems(appointmentId),
    enabled: !!appointmentId,
  });
};


// --- Create ---

interface ItemToCreate {
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
}

interface CreateAppointmentParams {
  cliente_id: string;
  responsavel_id: string;
  data_hora: Date;
  items: ItemToCreate[]; // Novo campo
  queryClient: QueryClient; // Adicionando QueryClient
  empresa_id?: string; // NOVO: Opcional para Super Admin
}

export const createAppointment = async ({ cliente_id, responsavel_id, data_hora, items, queryClient, empresa_id: provided_empresa_id }: CreateAppointmentParams) => {
  let empresa_id: string;

  if (provided_empresa_id) {
    empresa_id = provided_empresa_id;
  } else {
    // 1. Obter o ID da empresa do usuário logado (para Admin/Funcionário)
    const { data: companyData, error: companyError } = await supabase.rpc('get_user_company_id');

    if (companyError || !companyData) {
      console.error("Error fetching user company ID:", companyError);
      throw new Error("Não foi possível determinar a empresa do usuário.");
    }
    empresa_id = companyData;
  }
  
  // 2. Obter o ID do usuário logado (created_by)
  const { data: { user } } = await supabase.auth.getUser();
  const created_by = user?.id;

  if (!created_by) {
    throw new Error("Usuário não autenticado.");
  }

  // 3. Inserir o agendamento principal
  const { data: appointmentData, error: appointmentError } = await supabase
    .from("agendamentos")
    .insert({
      empresa_id: empresa_id,
      cliente_id: cliente_id,
      responsavel_id: responsavel_id,
      data_hora: data_hora.toISOString(),
      created_by: created_by,
      status: 'pendente', // Padrão
    })
    .select("id")
    .single();

  if (appointmentError || !appointmentData) {
    console.error("Error creating appointment:", appointmentError);
    throw new Error(appointmentError?.message || "Falha ao criar agendamento principal.");
  }
  
  const agendamento_id = appointmentData.id;

  // 4. Inserir os itens do agendamento
  const itemsPayload = items.map(item => ({
    agendamento_id: agendamento_id,
    produto_id: item.produto_id,
    quantidade: item.quantidade,
    preco_unitario: item.preco_unitario,
  }));

  const { error: itemsError } = await supabase
    .from("agendamento_itens")
    .insert(itemsPayload);

  if (itemsError) {
    console.error("Error inserting appointment items:", itemsError);
    // Se a inserção dos itens falhar, idealmente deveríamos reverter o agendamento principal.
    throw new Error("Agendamento criado, mas falha ao adicionar itens: " + itemsError.message);
  }
  
  // 5. Criar notificação para o usuário logado
  if (user) {
    createNotification({
      user_id: user.id,
      empresa_id: empresa_id,
      titulo: "Novo Agendamento Criado",
      mensagem: `Agendamento criado para ${data_hora.toLocaleDateString('pt-BR')} às ${data_hora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`,
      link: "/appointments",
      queryClient: queryClient,
    });
  }


  return appointmentData;
};

// --- Update ---

interface UpdateAppointmentParams {
  id: string;
  cliente_id: string;
  responsavel_id: string;
  data_hora: Date;
  status: Appointment['status'];
  queryClient: QueryClient; // Adicionando QueryClient
  // Itens não são atualizados via este endpoint, apenas o status e dados principais
}

export const updateAppointment = async ({ id, cliente_id, responsavel_id, data_hora, status, queryClient }: UpdateAppointmentParams) => {
  const { data, error } = await supabase
    .from("agendamentos")
    .update({
      cliente_id: cliente_id,
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
  
  // 2. Criar notificação para o usuário logado sobre a atualização
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    createNotification({
      user_id: user.id,
      empresa_id: data.empresa_id,
      titulo: "Status do Agendamento Atualizado",
      mensagem: `O agendamento foi alterado para o status: ${status}.`,
      link: "/appointments",
      queryClient: queryClient,
    });
  }
  
  // 3. Invalida a query de métricas diárias se o status for 'concluido'
  if (status === 'concluido') {
    const currentDate = new Date().toISOString().slice(0, 10);
    // Invalida a query que alimenta o gráfico de serviços por hora
    queryClient.invalidateQueries({ queryKey: ["dailyServiceByHour", data.empresa_id, currentDate] });
  }


  return data;
};

export const deleteAppointment = async (id: string) => {
  // A exclusão em cascata cuidará dos itens do agendamento
  const { error } = await supabase
    .from("agendamentos")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting appointment:", error);
    throw new Error(error.message);
  }
};