import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";

export interface TransactionItem {
  nome: string;
  quantidade: number;
  preco_unitario: number;
}

export interface ClientTransaction {
  id: string;
  data_transacao: string;
  tipo_transacao: 'Pedido' | 'Agendamento';
  valor_total: number;
  status: string;
  empresa_id: string;
  responsavel_nome: string | null;
  itens: TransactionItem[];
}

// NOVO: Interface para os filtros
interface TransactionFilters {
  type?: 'Pedido' | 'Agendamento' | 'all';
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  responsibleId?: string; // UUID
}

const fetchClientTransactions = async (clientId: string, filters: TransactionFilters): Promise<ClientTransaction[]> => {
  const { type, startDate, endDate, responsibleId } = filters;
  
  const { data, error } = await supabase.rpc('get_client_transactions', { 
    client_id_input: clientId,
    tipo_transacao_input: type === 'all' ? null : type,
    start_date_input: startDate || null,
    end_date_input: endDate || null,
    responsavel_id_input: responsibleId || null,
  });

  if (error) {
    console.error("Error fetching client transactions:", error);
    throw new Error("Failed to fetch client transactions: " + error.message);
  }
  
  return data.map(item => ({
    ...item,
    valor_total: parseFloat(item.valor_total) || 0,
    // O campo 'itens' é um JSONB, precisamos garantir que seja um array de objetos
    itens: item.itens || [],
  })) as ClientTransaction[];
};

export const useClientTransactions = (clientId: string, filters: TransactionFilters = {}) => {
  return useQuery<ClientTransaction[], Error>({
    queryKey: ["clientTransactions", clientId, filters],
    queryFn: () => fetchClientTransactions(clientId, filters),
    enabled: !!clientId,
  });
};