import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";

export interface SaleHistoryItem {
  data_venda: string;
  tipo_venda: 'Pedido' | 'Agendamento';
  quantidade: number;
  preco_unitario: number;
  valor_total: number;
  cliente_nome: string;
  cliente_email: string | null;
  cliente_telefone: string | null;
}

export interface WeeklySalesData {
  date_day: string; // YYYY-MM-DD
  total_count: number;
}

// --- Hook de Histórico de Vendas ---

const fetchProductSalesHistory = async (productId: string): Promise<SaleHistoryItem[]> => {
  const { data, error } = await supabase.rpc('get_product_sales_history', { product_id_input: productId });

  if (error) {
    console.error("Error fetching product sales history:", error);
    throw new Error("Failed to fetch sales history: " + error.message);
  }
  
  return data.map(item => ({
    ...item,
    quantidade: parseInt(item.quantidade),
    preco_unitario: parseFloat(item.preco_unitario),
    valor_total: parseFloat(item.valor_total),
  })) as SaleHistoryItem[];
};

export const useProductSalesHistory = (productId: string) => {
  return useQuery<SaleHistoryItem[], Error>({
    queryKey: ["productSalesHistory", productId],
    queryFn: () => fetchProductSalesHistory(productId),
    enabled: !!productId,
  });
};

// --- Hook de Dados do Gráfico Semanal ---

const fetchProductWeeklySalesCount = async (productId: string): Promise<WeeklySalesData[]> => {
  const { data, error } = await supabase.rpc('get_product_weekly_sales_count', { product_id_input: productId });

  if (error) {
    console.error("Error fetching product weekly sales count:", error);
    throw new Error("Failed to fetch weekly sales count: " + error.message);
  }
  
  return data.map(item => ({
    date_day: item.date_day,
    total_count: parseInt(item.total_count) || 0,
  })) as WeeklySalesData[];
};

export const useProductWeeklySalesCount = (productId: string) => {
  // A data atual é incluída implicitamente na RPC (CURRENT_DATE), mas adicionamos para forçar o refetch semanal
  const currentWeek = new Date().toISOString().slice(0, 10); 
  
  return useQuery<WeeklySalesData[], Error>({
    queryKey: ["productWeeklySalesCount", productId, currentWeek],
    queryFn: () => fetchProductWeeklySalesCount(productId),
    enabled: !!productId,
  });
};