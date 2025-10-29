import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";
import { useCurrentUserProfile } from "./user-profile";

// --- Funções de Fetch ---

interface RevenueMetrics {
  daily_revenue: number;
  weekly_revenue: number;
  monthly_revenue: number; // NOVO: Faturamento Mensal
}

export interface TopSellingItem {
  produto_id: string;
  nome_produto: string;
  tipo_produto: 'produto' | 'servico'; // Adicionado
  total_vendido: number;
  fotos: string[] | null; // NOVO: Array de URLs de fotos
}

/**
 * Busca o faturamento total (pedidos + agendamentos) para a empresa especificada
 * na data atual, na semana atual e no mês atual, usando uma função RPC.
 * @param companyId O ID da empresa a ser filtrada (ou undefined para todas as empresas - Super Admin).
 */
const fetchRevenueMetrics = async (companyId: string | undefined): Promise<RevenueMetrics> => {
  let rpcName = 'get_total_revenue_metrics';
  let rpcArgs: Record<string, any> = {};
  
  if (companyId) {
    rpcArgs = { company_id_input: companyId };
  } else {
    // Se companyId for undefined, usamos a versão ALL
    rpcName = 'get_total_revenue_metrics_all';
  }
  
  const { data, error } = await supabase.rpc(rpcName, rpcArgs);

  if (error) {
    console.error("Error fetching revenue metrics:", error);
    throw new Error("Failed to fetch revenue metrics: " + error.message);
  }
  
  // A função retorna uma tabela com uma única linha
  const result = data?.[0];

  if (!result) {
    return { daily_revenue: 0, weekly_revenue: 0, monthly_revenue: 0 };
  }

  return {
    daily_revenue: parseFloat(result.daily_revenue) || 0,
    weekly_revenue: parseFloat(result.weekly_revenue) || 0,
    monthly_revenue: parseFloat(result.monthly_revenue) || 0,
  };
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
 * @param companyId O ID da empresa a ser filtrada (ou undefined para todas as empresas - Super Admin).
 */
const fetchTopSellingItems = async (companyId: string | undefined): Promise<TopSellingItem[]> => {
  let rpcName = 'get_top_selling_items';
  let rpcArgs: Record<string, any> = {};
  
  if (companyId) {
    rpcArgs = { company_id_input: companyId };
  } else {
    // Se companyId for undefined, usamos a versão ALL
    rpcName = 'get_top_selling_items_all';
  }
  
  const { data, error } = await supabase.rpc(rpcName, rpcArgs);

  if (error) {
    console.error("Error fetching top selling items:", error);
    throw new Error("Failed to fetch top selling items: " + error.message);
  }
  
  // Converte total_vendido para número
  return data.map(item => ({
    ...item,
    total_vendido: parseInt(item.total_vendido) || 0,
    // O campo 'fotos' já vem como array de strings (text[])
    fotos: item.fotos || null, 
  })) as TopSellingItem[];
};

/**
 * NOVO: Busca os 10 serviços mais vendidos para a empresa.
 * @param companyId O ID da empresa a ser filtrada (ou undefined para todas as empresas - Super Admin).
 */
const fetchTopSellingServices = async (companyId: string | undefined): Promise<TopSellingItem[]> => {
  let rpcName = 'get_top_selling_services';
  let rpcArgs: Record<string, any> = {};
  
  if (companyId) {
    rpcArgs = { company_id_input: companyId };
  } else {
    // Se companyId for undefined, usamos a versão ALL
    rpcName = 'get_top_selling_services_all';
  }
  
  const { data, error } = await supabase.rpc(rpcName, rpcArgs);

  if (error) {
    console.error("Error fetching top selling services:", error);
    throw new Error("Failed to fetch top selling services: " + error.message);
  }
  
  // Converte total_vendido para número
  return data.map(item => ({
    ...item,
    total_vendido: parseInt(item.total_vendido) || 0,
    fotos: item.fotos || null, 
  })) as TopSellingItem[];
};


// --- Hooks de Uso ---

export const useRevenueMetrics = (companyId: string | undefined) => {
  // Adiciona a data atual na query key para garantir que o cache seja atualizado diariamente
  const currentDate = new Date().toISOString().slice(0, 10); 
  
  return useQuery<RevenueMetrics, Error>({
    queryKey: ["revenueMetrics", companyId, currentDate],
    queryFn: () => fetchRevenueMetrics(companyId),
    // Habilitado sempre, pois a função agora lida com companyId opcional
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
    queryFn: () => fetchTopSellingItems(companyId),
    enabled: true,
  });
};

// Hook para buscar apenas os Top 10 Serviços (agora usa a nova RPC)
export const useTopSellingServices = (companyId: string | undefined) => {
  return useQuery<TopSellingItem[], Error>({
    queryKey: ["topSellingServices", companyId],
    queryFn: () => fetchTopSellingServices(companyId),
    enabled: true,
  });
};