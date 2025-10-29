import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";
import { Order, OrderItem } from "./orders";
import { Appointment, AppointmentItem } from "./appointments";
import { Client } from "./clients";
import { Team, TeamMember } from "./teams";
import { Company } from "./companies";

// --- Tipos de Filtro ---

interface DateRange {
  startDate: string; // ISO date string (YYYY-MM-DD)
  endDate: string;   // ISO date string (YYYY-MM-DD)
}

// --- Fetch de Pedidos para Relatório ---

interface OrderReport extends Omit<Order, 'pedido_itens'> {
  pedido_itens: OrderItem[];
  empresas: { nome: string } | null; // NOVO: Adicionado empresas
}

const fetchOrderReport = async (companyId: string | undefined, filters: DateRange): Promise<OrderReport[]> => {
  let query = supabase
    .from("pedidos")
    .select(`
      id,
      empresa_id,
      cliente_id,
      valor_total,
      status,
      created_at,
      clientes (nome, email, telefone, endereco_completo),
      empresas (nome),
      pedido_itens (
        id,
        produto_id,
        quantidade,
        preco_unitario,
        produtos (nome, tipo)
      )
    `);
    
  // 1. Filtrar por Empresa (se fornecido)
  if (companyId) {
    query = query.eq('empresa_id', companyId);
  }
  
  // 2. Filtrar por Intervalo de Data (created_at)
  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate);
  }
  if (filters.endDate) {
    // Adiciona 1 dia ao endDate para incluir o dia inteiro
    const end = new Date(filters.endDate);
    end.setDate(end.getDate() + 1);
    query = query.lt('created_at', end.toISOString());
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching order report:", error);
    throw new Error("Failed to fetch order report: " + error.message);
  }

  return data as OrderReport[];
};

export const useOrderReport = (companyId: string | undefined, filters: DateRange) => {
  return useQuery<OrderReport[], Error>({
    queryKey: ["orderReport", companyId, filters],
    queryFn: () => fetchOrderReport(companyId, filters),
    enabled: true,
  });
};


// --- Fetch de Agendamentos para Relatório ---

interface AppointmentReport extends Omit<Appointment, 'agendamento_itens'> {
  agendamento_itens: AppointmentItem[];
  empresas: { nome: string } | null; // NOVO: Adicionado empresas
}

const fetchAppointmentReport = async (companyId: string | undefined, filters: DateRange): Promise<AppointmentReport[]> => {
  let query = supabase
    .from("agendamentos")
    .select(`
      id,
      empresa_id,
      cliente_id,
      responsavel_id,
      data_hora,
      status,
      created_at,
      clientes (nome, email, telefone, endereco_completo),
      responsavel:usuarios!agendamentos_responsavel_id_fkey (nome_completo),
      empresas (nome),
      agendamento_itens (
        id,
        produto_id,
        quantidade,
        preco_unitario,
        produtos (nome, tipo)
      )
    `);
    
  // 1. Filtrar por Empresa (se fornecido)
  if (companyId) {
    query = query.eq('empresa_id', companyId);
  }
  
  // 2. Filtrar por Intervalo de Data (data_hora)
  if (filters.startDate) {
    query = query.gte('data_hora', filters.startDate);
  }
  if (filters.endDate) {
    // Adiciona 1 dia ao endDate para incluir o dia inteiro
    const end = new Date(filters.endDate);
    end.setDate(end.getDate() + 1);
    query = query.lt('data_hora', end.toISOString());
  }

  const { data, error } = await query.order("data_hora", { ascending: false });

  if (error) {
    console.error("Error fetching appointment report:", error);
    throw new Error("Failed to fetch appointment report: " + error.message);
  }

  return data as AppointmentReport[];
};

export const useAppointmentReport = (companyId: string | undefined, filters: DateRange) => {
  return useQuery<AppointmentReport[], Error>({
    queryKey: ["appointmentReport", companyId, filters],
    queryFn: () => fetchAppointmentReport(companyId, filters),
    enabled: true,
  });
};

// --- Fetch de Clientes para Relatório ---

interface ClientReport extends Omit<Client, 'empresa'> {
  empresa: { nome: string } | null;
}

const fetchClientReport = async (companyId: string | undefined): Promise<ClientReport[]> => {
  let query = supabase
    .from("clientes")
    .select(`
      id,
      empresa_id,
      nome,
      email,
      telefone,
      endereco_completo,
      created_at,
      empresa:empresas (nome)
    `);
    
  if (companyId) {
    query = query.eq('empresa_id', companyId);
  }

  const { data, error } = await query.order("nome", { ascending: true });

  if (error) {
    console.error("Error fetching client report:", error);
    throw new Error("Failed to fetch client report: " + error.message);
  }

  return data as ClientReport[];
};

export const useClientReport = (companyId: string | undefined) => {
  return useQuery<ClientReport[], Error>({
    queryKey: ["clientReport", companyId],
    queryFn: () => fetchClientReport(companyId),
    enabled: true,
  });
};

// --- Fetch de Equipes para Relatório ---

interface TeamReport extends Omit<Team, 'empresas' | 'membros'> {
  empresas: { nome: string } | null;
  membros: TeamMember[];
}

const fetchTeamReport = async (companyId: string | undefined): Promise<TeamReport[]> => {
  let query = supabase
    .from("equipes")
    .select(`
      id,
      empresa_id,
      nome,
      meta_mensal_valor,
      meta_mensal_quantidade,
      created_at,
      empresas (nome),
      membros:equipe_membros (
        usuario_id,
        usuarios (nome_completo)
      )
    `);
    
  if (companyId) {
    query = query.eq('empresa_id', companyId);
  }

  const { data, error } = await query.order("nome", { ascending: true });

  if (error) {
    console.error("Error fetching team report:", error);
    throw new Error("Failed to fetch team report: " + error.message);
  }

  // Mapeamos para garantir que a estrutura de membros seja plana para exportação
  return data.map(team => ({
    ...team,
    membros: team.membros.map((m: any) => ({
      usuario_id: m.usuario_id,
      usuarios: m.usuarios,
    })),
  })) as TeamReport[];
};

export const useTeamReport = (companyId: string | undefined) => {
  return useQuery<TeamReport[], Error>({
    queryKey: ["teamReport", companyId],
    queryFn: () => fetchTeamReport(companyId),
    enabled: true,
  });
};

// --- Fetch de Empresas para Relatório (Apenas Super Admin) ---

const fetchCompanyReport = async (): Promise<Company[]> => {
  // A RLS já garante que apenas Super Admins vejam todas as empresas
  const { data, error } = await supabase
    .from("empresas")
    .select("id, nome, cnpj, dono_id, telefone, endereco_completo, email, created_at")
    .order("nome", { ascending: true });

  if (error) {
    console.error("Error fetching company report:", error);
    throw new Error("Failed to fetch company report: " + error.message);
  }

  return data as Company[];
};

export const useCompanyReport = () => {
  return useQuery<Company[], Error>({
    queryKey: ["companyReport"],
    queryFn: fetchCompanyReport,
    enabled: true,
  });
};

// --- Fetch de Comissionamentos para Relatório ---

interface CommissionRecordReport extends CommissionRecord {
  empresas: { nome: string } | null; // Adicionado empresas
}

const fetchCommissionRecordsReport = async (companyId: string | undefined): Promise<CommissionRecordReport[]> => {
  let query = supabase
    .from("comissionamentos")
    .select(`
      id,
      usuario_id,
      referencia_id,
      tipo_referencia,
      valor_comissao,
      status,
      created_at,
      usuarios (nome_completo),
      empresas (nome)
    `);
    
  if (companyId) {
    query = query.eq('empresa_id', companyId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching commission records report:", error);
    throw new Error("Failed to fetch commission records report: " + error.message);
  }
  
  return data.map(c => ({
    ...c,
    valor_comissao: parseFloat(String(c.valor_comissao)) || 0,
  })) as CommissionRecordReport[];
};

export const useCommissionReport = (companyId: string | undefined) => {
  return useQuery<CommissionRecordReport[], Error>({
    queryKey: ["commissionReport", companyId],
    queryFn: () => fetchCommissionRecordsReport(companyId),
    enabled: true,
  });
};