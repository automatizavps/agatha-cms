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

const fetchClientTransactions = async (clientId: string): Promise<ClientTransaction[]> => {
  const { data, error } = await supabase.rpc('get_client_transactions', { client_id_input: clientId });

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

export const useClientTransactions = (clientId: string) => {
  return useQuery<ClientTransaction[], Error>({
    queryKey: ["clientTransactions", clientId],
    queryFn: () => fetchClientTransactions(clientId),
    enabled: !!clientId,
  });
};