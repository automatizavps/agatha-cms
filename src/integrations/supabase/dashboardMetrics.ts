import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";
import { useCurrentUserProfile } from "./user-profile";

// --- Funções de Fetch ---

interface RevenueMetrics {
  daily_revenue: number;
  weekly_revenue: number;
}

export interface TopSellingItem {
  produto_id: string;
  nome_produto: string;
  tipo_produto: 'produto' | 'servico'; // Adicionado
  total_vendido: number;
}

/**
 * Busca o faturamento total de pedidos 'entregues' para a empresa especificada
 * nos últimos 24h e 7 dias.
 * @param companyId O ID da empresa a ser filtrada.
 */
const fetchRevenueMetrics = async (companyId: string): Promise<RevenueMetrics> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  // 1. Faturamento Diário (últimas 24h)
  const { data: dailyData, error: dailyError } = await supabase
    .from("pedidos")
    .select("valor_total")
    .eq("empresa_id", companyId)
    .eq("status", "entregue")
    .gte("created_at", yesterday.toISOString());

  if (dailyError) {
    console.error("Error fetching daily revenue:", dailyError);
    throw new Error("Failed to fetch daily revenue");
  }
  
  const daily_revenue = dailyData.reduce((sum, order) => sum + order.valor_total, 0);

  // 2. Faturamento Semanal (últimos 7 dias)
  const { data: weeklyData, error: weeklyError } = await supabase
    .from("pedidos")
    .select("valor_total")
    .eq("empresa_id", companyId)
    .eq("status", "entregue")
    .gte("created_at", sevenDaysAgo.toISOString());

  if (weeklyError) {
    console.error("Error fetching weekly revenue:", weeklyError);
    throw new Error("Failed to fetch weekly revenue");
  }
  
  const weekly_revenue = weeklyData.reduce((sum, order) => sum + order.valor_total, 0);

  return { daily_revenue, weekly_revenue };
};

/**
 * Busca a contagem total de produtos (tipo='produto') cadastrados.
 * @param companyId O ID da empresa a ser filtrada.
 */
const fetchProductCount = async (companyId: string): Promise<number> => {
  const { count, error } = await supabase
    .from("produtos")
    .select("id", { count: 'exact', head: true })
    .eq("empresa_id", companyId)
    .eq("tipo", "produto");

  if (error) {
    console.error("Error fetching product count:", error);
    throw new Error("Failed to fetch product count");
  }

  return count || 0;
};

/**
 * Busca os 10 itens mais vendidos (produtos e serviços) para a empresa.
 * @param companyId O ID da empresa a ser filtrada.
 */
const fetchTopSellingItems = async (companyId: string): Promise<TopSellingItem[]> => {
  const { data, error } = await supabase.rpc('get_top_selling_items', { company_id_input: companyId });

  if (error) {
    console.error("Error fetching top selling items:", error);
    throw new Error("Failed to fetch top selling items: " + error.message);
  }
  
  // Converte total_vendido para número
  return data.map(item => ({
    ...item,
    total_vendido: parseInt(item.total_vendido) || 0,
  })) as TopSellingItem[];
};


// --- Hooks de Uso ---

export const useRevenueMetrics = (companyId: string | undefined) => {
  return useQuery<RevenueMetrics, Error>({
    queryKey: ["revenueMetrics", companyId],
    queryFn: () => fetchRevenueMetrics(companyId!),
    enabled: !!companyId,
  });
};

export const useProductCount = (companyId: string | undefined) => {
  return useQuery<number, Error>({
    queryKey: ["productCount", companyId],
    queryFn: () => fetchProductCount(companyId!),
    enabled: !!companyId,
  });
};

export const useTopSellingItems = (companyId: string | undefined) => {
  return useQuery<TopSellingItem[], Error>({
    queryKey: ["topSellingItems", companyId],
    queryFn: () => fetchTopSellingItems(companyId!),
    enabled: !!companyId,
  });
};

// Novo hook para buscar apenas os Top 10 Serviços
export const useTopSellingServices = (companyId: string | undefined) => {
  const { data: allItems, isLoading, isError, error } = useTopSellingItems(companyId);
  
  const services = allItems?.filter(item => item.tipo_produto === 'servico') || [];
  
  // Limita a 10, embora a RPC já limite, garantimos aqui
  const top10Services = services.slice(0, 10);

  return {
    data: top10Services,
    isLoading,
    isError,
    error,
  };
};