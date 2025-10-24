import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";
import { useCurrentUserProfile } from "./user-profile";

// --- Funções de Fetch ---

interface RevenueMetrics {
  total_revenue: number; // Total de receita no período
  total_orders: number;  // Total de pedidos no período
}

export interface TopSellingItem {
  produto_id: string;
  nome_produto: string;
  tipo_produto: 'produto' | 'servico'; // Adicionado
  total_vendido: number;
}

/**
 * Busca o faturamento total de pedidos 'entregues' e a contagem de pedidos
 * para a empresa e período especificados.
 * @param companyId O ID da empresa a ser filtrada (ou undefined para todas as empresas - Super Admin).
 * @param startDate Data de início do filtro (opcional).
 * @param endDate Data de fim do filtro (opcional).
 */
const fetchRevenueMetrics = async (companyId: string | undefined, startDate?: Date, endDate?: Date): Promise<RevenueMetrics> => {
  let query = supabase
    .from("pedidos")
    .select("valor_total")
    .eq("status", "entregue");
    
  if (companyId) {
    query = query.eq("empresa_id", companyId);
  }
  
  // Filtragem por data
  if (startDate) {
    query = query.gte("created_at", startDate.toISOString());
  }
  if (endDate) {
    // Adiciona 1 dia ao endDate para incluir o dia inteiro
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);
    query = query.lt("created_at", end.toISOString());
  }

  const { data: ordersData, error: ordersError } = await query;

  if (ordersError) {
    console.error("Error fetching revenue metrics:", ordersError);
    throw new Error("Failed to fetch revenue metrics");
  }
  
  const total_revenue = ordersData.reduce((sum, order) => sum + order.valor_total, 0);
  const total_orders = ordersData.length;

  return { total_revenue, total_orders };
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
 * @param companyId O ID da empresa a ser filtrada (obrigatório).
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

export const useRevenueMetrics = (companyId: string | undefined, startDate?: Date, endDate?: Date) => {
  // A query key agora inclui as datas para re-fetch quando o filtro muda
  const dateKey = startDate?.toISOString() + endDate?.toISOString();
  
  return useQuery<RevenueMetrics, Error>({
    queryKey: ["revenueMetrics", companyId, dateKey],
    queryFn: () => fetchRevenueMetrics(companyId, startDate, endDate),
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