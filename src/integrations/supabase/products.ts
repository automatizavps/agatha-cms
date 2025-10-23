import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";

export type ProductType = 'produto' | 'servico';

export interface Product {
  id: string;
  empresa_id: string;
  nome: string;
  preco: number;
  created_at: string;
  
  // Novos campos
  tipo: ProductType;
  tempo_servico: number | null; // Em minutos, para serviços
  estoque_total: number | null; // Para produtos
  fotos: string[] | null; // URLs das fotos
  
  // Novos campos de metadados
  marca: string | null;
  categoria: string | null;
}

// --- Fetch Geral (mantido para compatibilidade, mas não será usado nas novas páginas) ---

const fetchAllProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase
    .from("produtos")
    .select("id, empresa_id, nome, preco, created_at, tipo, tempo_servico, estoque_total, fotos, marca, categoria")
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
    queryFn: fetchAllProducts,
  });
};

// --- Fetch Específico para Produtos (tipo='produto') ---

const fetchProductsOnly = async (): Promise<Product[]> => {
  const { data, error } = await supabase
    .from("produtos")
    .select("id, empresa_id, nome, preco, created_at, tipo, tempo_servico, estoque_total, fotos, marca, categoria")
    .eq('tipo', 'produto')
    .order("nome", { ascending: true });

  if (error) {
    console.error("Error fetching products:", error);
    throw new Error("Failed to fetch products");
  }

  return data as Product[];
};

export const useProductsOnly = () => {
  return useQuery<Product[], Error>({
    queryKey: ["products_only"],
    queryFn: fetchProductsOnly,
  });
};

// --- Fetch Específico para Serviços (tipo='servico') ---

const fetchServicesOnly = async (): Promise<Product[]> => {
  const { data, error } = await supabase
    .from("produtos")
    .select("id, empresa_id, nome, preco, created_at, tipo, tempo_servico, estoque_total, fotos, marca, categoria")
    .eq('tipo', 'servico')
    .order("nome", { ascending: true });

  if (error) {
    console.error("Error fetching services:", error);
    throw new Error("Failed to fetch services");
  }

  return data as Product[];
};

export const useServicesOnly = () => {
  return useQuery<Product[], Error>({
    queryKey: ["services_only"],
    queryFn: fetchServicesOnly,
  });
};


// --- Create ---

interface CreateProductParams {
  nome: string;
  preco: number;
  tipo: ProductType;
  tempo_servico: number | null;
  estoque_total: number | null;
  fotos: string[] | null;
  marca: string | null;
  categoria: string | null;
  empresa_id?: string; // Opcional: Usado apenas pelo Super Admin
}

export const createProduct = async ({ nome, preco, tipo, tempo_servico, estoque_total, fotos, marca, categoria, empresa_id: provided_empresa_id }: CreateProductParams) => {
  let empresa_id: string;

  if (provided_empresa_id) {
    // Se o ID da empresa foi fornecido (Super Admin), usamos ele.
    empresa_id = provided_empresa_id;
  } else {
    // Caso contrário (Admin), obtemos o ID da empresa do usuário logado.
    const { data: companyData, error: companyError } = await supabase.rpc('get_user_company_id');

    if (companyError || !companyData) {
      console.error("Error fetching user company ID:", companyError);
      throw new Error("Não foi possível determinar a empresa do usuário.");
    }
    empresa_id = companyData;
  }
  
  if (!empresa_id) {
     throw new Error("ID da empresa é obrigatório para criar um produto/serviço.");
  }

  // 2. Inserir o produto
  const { data, error } = await supabase
    .from("produtos")
    .insert({
      empresa_id: empresa_id,
      nome: nome,
      preco: preco,
      tipo: tipo,
      tempo_servico: tipo === 'servico' ? tempo_servico : null,
      estoque_total: tipo === 'produto' ? estoque_total : null,
      fotos: fotos,
      marca: tipo === 'produto' ? marca : null, // Marca só para produto
      categoria: categoria, // Categoria para ambos
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
  tipo: ProductType;
  tempo_servico: number | null;
  estoque_total: number | null;
  fotos: string[] | null;
  marca: string | null;
  categoria: string | null;
  empresa_id?: string; // Adicionado para Super Admin
}

export const updateProduct = async ({ id, nome, preco, tipo, tempo_servico, estoque_total, fotos, marca, categoria, empresa_id }: UpdateProductParams) => {
  const updatePayload: Record<string, any> = {
    nome: nome,
    preco: preco,
    tipo: tipo,
    tempo_servico: tipo === 'servico' ? tempo_servico : null,
    estoque_total: tipo === 'produto' ? estoque_total : null,
    fotos: fotos,
    marca: tipo === 'produto' ? marca : null, // Marca só para produto
    categoria: categoria, // Categoria para ambos
  };
  
  // Permite que o Super Admin altere a empresa_id
  if (empresa_id) {
    updatePayload.empresa_id = empresa_id;
  }
  
  const { data, error } = await supabase
    .from("produtos")
    .update(updatePayload)
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