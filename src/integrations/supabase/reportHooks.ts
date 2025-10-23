import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";
import { Order, OrderItem } from "./orders";
import { Appointment, AppointmentItem } from "./appointments";

// --- Tipos de Filtro ---

interface DateRange {
  startDate: string; // ISO date string (YYYY-MM-DD)
  endDate: string;   // ISO date string (YYYY-MM-DD)
}

// --- Fetch de Pedidos para Relatório ---

interface OrderReport extends Omit<Order, 'pedido_itens'> {
  pedido_itens: OrderItem[];
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