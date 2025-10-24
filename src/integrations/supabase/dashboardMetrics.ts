import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";
import { useCurrentUserProfile } from "./user-profile";
import { Order } from "./orders"; // Importando Order

// --- Funções de Fetch ---

interface RevenueMetrics {
  total_revenue: number;
  total_orders: number;
}

export interface TopSellingItem {
  produto_id: string;
  nome_produto: string;
  tipo_produto: 'produto' | 'servico'; // Adicionado
  total_vendido: number;
}

/**
 * Busca todos os pedidos 'entregues' dentro do período especificado.
 * @param companyId O ID da empresa a ser filtrada (ou undefined para todas as empresas - Super Admin).
 * @param startDate Data de início do filtro.
 * @param endDate Data de fim do filtro.
 */
const fetchOrdersForMetrics = async (companyId: string | undefined, startDate?: Date, endDate?: Date): Promise<Order[]> => {
  let query = supabase
    .from("pedidos")
    .select("id, empresa_id, valor_total, status, created_at")
    .eq("status", "entregue"); // Apenas pedidos entregues contam como receita
    
  if (companyId) {
    query = query.eq("empresa_id", companyId);
  }
  
  if (startDate) {
    query = query.gte('created_at', startDate.toISOString());
  }
  if (endDate) {
    // Adiciona 1 dia ao endDate para incluir o dia inteiro
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);
    end.setHours(0, 0, 0, 0);
    query = query.lt('created_at', end.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching orders for metrics:", error);
    throw new Error("Failed to fetch orders for metrics");
  }
  
  return data as Order[];
};


/**
 * Hook que calcula o faturamento total e a contagem de pedidos entregues no período.
 */
export const useRevenueMetrics = (companyId: string | undefined, startDate?: Date, endDate?: Date) => {
  // Cria uma chave de cache baseada no período
  const dateKey = startDate && endDate ? `${startDate.toISOString().slice(0, 10)}_${endDate.toISOString().slice(0, 10)}` : 'all_time';
  
  return useQuery<RevenueMetrics, Error>({
    queryKey: ["revenueMetrics", companyId, dateKey],
    queryFn: async () => {
      const orders = await fetchOrdersForMetrics(companyId, startDate, endDate);
      
      const total_revenue = orders.reduce((sum, order) => sum + order.valor_total, 0);
      const total_orders = orders.length;
      
      return { total_revenue, total_orders };
    },
    enabled: true, 
  });
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

// Mantendo useRevenueMetrics acima, pois foi refatorado.

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