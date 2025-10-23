import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";

export interface Product {
  id: string;
  empresa_id: string;
  nome: string;
  preco: number;
  created_at: string;
}

// --- Fetch ---

const fetchProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase
    .from("produtos")
    .select("id, empresa_id, nome, preco, created_at")
    .order("nome", { ascending: true });

  if (error) {
    console.error("Error fetching products:", error);
    throw new Error("Failed to fetch products");
  }

  return data as Product[];
};

export const useProducts = () => {
  return useQuery<Product[], Error>({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });
};

// --- Create ---

interface CreateProductParams {
  nome: string;
  preco: number;
}

export const createProduct = async ({ nome, preco }: CreateProductParams) => {
  // 1. Obter o ID da empresa do usuário logado
  const { data: companyData, error: companyError } = await supabase.rpc('get_user_company_id');

  if (companyError || !companyData) {
    console.error("Error fetching user company ID:", companyError);
    throw new Error("Não foi possível determinar a empresa do usuário.");
  }
  
  const empresa_id = companyData;

  // 2. Inserir o produto
  const { data, error } = await supabase
    .from("produtos")
    .insert({
      empresa_id: empresa_id,
      nome: nome,
      preco: preco,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating product:", error);
    throw new Error(error.message);
  }

  return data;
};

// --- Update ---

interface UpdateProductParams {
  id: string;
  nome: string;
  preco: number;
}

export const updateProduct = async ({ id, nome, preco }: UpdateProductParams) => {
  const { data, error } = await supabase
    .from("produtos")
    .update({
      nome: nome,
      preco: preco,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating product:", error);
    throw new Error(error.message);
  }

  return data;
};

// --- Delete ---

export const deleteProduct = async (id: string) => {
  const { error } = await supabase
    .from("produtos")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting product:", error);
    throw new Error(error.message);
  }
};