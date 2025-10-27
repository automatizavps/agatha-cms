import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";

export interface TopClientOrder {
  cliente_id: string;
  nome_cliente: string;
  avatar_url: string | null;
  total_valor: number;
  total_pedidos: number;
}

export interface TopClientAppointment {
  cliente_id: string;
  nome_cliente: string;
  avatar_url: string | null;
  total_agendamentos: number;
}

// --- Fetch Top Clients by Orders ---

const fetchTopClientsByOrders = async (companyId: string | undefined): Promise<TopClientOrder[]> => {
  const { data, error } = await supabase.rpc('get_top_10_clients_by_orders', { company_id_input: companyId });

  if (error) {
    console.error("Error fetching top clients by orders:", error);
    throw new Error("Failed to fetch top clients by orders: " + error.message);
  }
  
  return data.map(item => ({
    ...item,
    total_valor: parseFloat(item.total_valor) || 0,
    total_pedidos: parseInt(item.total_pedidos) || 0,
  })) as TopClientOrder[];
};

export const useTopClientsByOrders = (companyId: string | undefined) => {
  return useQuery<TopClientOrder[], Error>({
    queryKey: ["topClientsByOrders", companyId],
    queryFn: () => fetchTopClientsByOrders(companyId),
    enabled: true,
  });
};

// --- Fetch Top Clients by Appointments ---

const fetchTopClientsByAppointments = async (companyId: string | undefined): Promise<TopClientAppointment[]> => {
  const { data, error } = await supabase.rpc('get_top_10_clients_by_appointments', { company_id_input: companyId });

  if (error) {
    console.error("Error fetching top clients by appointments:", error);
    throw new Error("Failed to fetch top clients by appointments: " + error.message);
  }
  
  return data.map(item => ({
    ...item,
    total_agendamentos: parseInt(item.total_agendamentos) || 0,
  })) as TopClientAppointment[];
};

export const useTopClientsByAppointments = (companyId: string | undefined) => {
  return useQuery<TopClientAppointment[], Error>({
    queryKey: ["topClientsByAppointments", companyId],
    queryFn: () => fetchTopClientsByAppointments(companyId),
    enabled: true,
  });
};