import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";
import { Order } from "./orders";

const fetchLatestOrders = async (companyId: string | undefined): Promise<Order[]> => {
  let query = supabase
    .from("pedidos")
    .select(`
      id,
      empresa_id,
      cliente_id,
      valor_total,
      status,
      created_at,
      clientes (nome),
      pedido_itens (
        id,
        produto_id,
        quantidade,
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
    console.error("Error fetching latest orders:", error);
    throw new Error("Failed to fetch latest orders");
  }

  return data as Order[];
};

export const useLatestOrders = (companyId: string | undefined) => {
  return useQuery<Order[], Error>({
    queryKey: ["latestOrders", companyId],
    queryFn: () => fetchLatestOrders(companyId),
    enabled: true,
  });
};