import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";

export interface ProductMetrics {
  totalProducts: number;
  totalServices: number;
  totalItems: number;
}

const fetchProductMetrics = async (): Promise<ProductMetrics> => {
  // A RLS garante que apenas produtos/serviços da empresa do usuário (ou todos, se Super Admin) sejam retornados.
  
  // 1. Contagem total de produtos (tipo='produto')
  const { count: productsCount, error: productsError } = await supabase
    .from("produtos")
    .select("id", { count: 'exact', head: true })
    .eq('tipo', 'produto');

  if (productsError) {
    console.error("Error fetching product count:", productsError);
    throw new Error("Failed to fetch product count");
  }
  
  // 2. Contagem total de serviços (tipo='servico')
  const { count: servicesCount, error: servicesError } = await supabase
    .from("produtos")
    .select("id", { count: 'exact', head: true })
    .eq('tipo', 'servico');

  if (servicesError) {
    console.error("Error fetching service count:", servicesError);
    throw new Error("Failed to fetch service count");
  }
  
  const totalProducts = productsCount || 0;
  const totalServices = servicesCount || 0;

  return {
    totalProducts: totalProducts,
    totalServices: totalServices,
    totalItems: totalProducts + totalServices,
  };
};

export const useProductMetrics = () => {
  return useQuery<ProductMetrics, Error>({
    queryKey: ["productMetrics"],
    queryFn: fetchProductMetrics,
  });
};