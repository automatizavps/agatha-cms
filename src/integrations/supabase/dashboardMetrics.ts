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
 * na data atual e na semana atual.
 * @param companyId O ID da empresa a ser filtrada (ou undefined para todas as empresas - Super Admin).
 */
const fetchRevenueMetrics = async (companyId: string | undefined): Promise<RevenueMetrics> => {
  // Define o início do dia de hoje (00:00:00)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  // Define o início da semana (Domingo, 00:00:00)
  const dayOfWeek = todayStart.getDay(); // 0 = Domingo, 6 = Sábado
  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - dayOfWeek);


  // 1. Faturamento Diário (Hoje)
  let dailyQuery = supabase
    .from("pedidos")
    .select("valor_total")
    .eq("status", "entregue")
    .gte("created_at", todayStart.toISOString());
    
  if (companyId) {
    dailyQuery = dailyQuery.eq("empresa_id", companyId);
  }

  const { data: dailyData, error: dailyError } = await dailyQuery;

  if (dailyError) {
    console.error("Error fetching daily revenue:", dailyError);
    throw new Error("Failed to fetch daily revenue");
  }
  
  const daily_revenue = dailyData.reduce((sum, order) => sum + order.valor_total, 0);

  // 2. Faturamento Semanal (Esta Semana)
  let weeklyQuery = supabase
    .from("pedidos")
    .select("valor_total")
    .eq("status", "entregue")
    .gte("created_at", weekStart.toISOString());
    
  if (companyId) {
    weeklyQuery = weeklyQuery.eq("empresa_id", companyId);
  }

  const { data: weeklyData, error: weeklyError } = await weeklyQuery;

  if (weeklyError) {
    console.error("Error fetching weekly revenue:", weeklyError);
    throw new Error("Failed to fetch weekly revenue");
  }
  
  const weekly_revenue = weeklyData.reduce((sum, order) => sum + order.valor_total, 0);

  return { daily_revenue, weekly_revenue };
};

/**
 * Busca a contagem total de produtos (tipo='produto') cadastrados.
 * @param companyId O ID da empresa a ser filtrada (ou undefined para todas as empresas - Super Admin).
 */
const fetchProductCount = async (companyId: string | undefined): Promise<number> => {
  let query = supabase
    .from("produtos")
    .select("id", { count: 'exact', head: true })
    .eq("tipo", "produto");
    
  if (companyId) {
    query = query.eq("empresa_id", companyId);
  }

  const { count, error } = await query;

  if (error) {
    console.error("Error fetching product count:", error);
    throw new Error("Failed to fetch product count");
  }

  return count || 0;
};

/**
 * Busca a contagem total de clientes cadastrados.
 * @param companyId O ID da empresa a ser filtrada (ou undefined para todas as empresas - Super Admin).
 */
const fetchClientCount = async (companyId: string | undefined): Promise<number> => {
  let query = supabase
    .from("clientes")
    .select("id", { count: 'exact', head: true });
    
  if (companyId) {
    query = query.eq("empresa_id", companyId);
  }

  const { count, error } = await query;

  if (error) {
    console.error("Error fetching client count:", error);
    throw new Error("Failed to fetch client count");
  }

  return count || 0;
};


/**
 * Busca os 10 itens mais vendidos (produtos e serviços) para a empresa.
 * NOTA: A função RPC 'get_top_selling_items' exige um company_id_input. 
 * Se companyId for undefined, não podemos chamar a RPC.
 * Para 'Todas as Empresas', esta métrica será desabilitada, pois a lógica de agregação
 * de vendas de pedidos e agendamentos é complexa demais para ser feita no cliente.
 * @param companyId O ID da empresa a ser filtrada (ou undefined para todas as empresas - Super Admin).
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
  // Adiciona a data atual na query key para garantir que o cache seja atualizado diariamente
  const currentDate = new Date().toISOString().slice(0, 10); 
  
  return useQuery<RevenueMetrics, Error>({
    queryKey: ["revenueMetrics", companyId, currentDate],
    queryFn: () => fetchRevenueMetrics(companyId),
    enabled: true, 
  });
};

export const useProductCount = (companyId: string | undefined) => {
  return useQuery<number, Error>({
    queryKey: ["productCount", companyId],
    queryFn: () => fetchProductCount(companyId),
    enabled: true,
  });
};

export const useClientCount = (companyId: string | undefined) => {
  return useQuery<number, Error>({
    queryKey: ["clientCount", companyId],
    queryFn: () => fetchClientCount(companyId),
    enabled: true,
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