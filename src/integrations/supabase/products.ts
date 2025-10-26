import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";
import { createNotification } from "./notifications"; // Importando createNotification
import { QueryClient } from "@tanstack/react-query"; // Importando QueryClient

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
  
  // Relacionamento com a empresa
  empresa: {
    nome: string;
  } | null;
}

// Função auxiliar para mapear o relacionamento de empresa
const mapProductData = (data: any[]): Product[] => {
  return data.map(item => ({
    ...item,
    // Supabase retorna array para relacionamentos, pegamos o primeiro ou null
    empresa: item.empresa?.[0] || null, 
  })) as Product[];
};

// --- Fetch Geral (mantido para compatibilidade, mas não será usado nas novas páginas) ---

const fetchAllProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase
    .from("produtos")
    .select("id, empresa_id, nome, preco, created_at, tipo, tempo_servico, estoque_total, fotos, marca, categoria, empresa:empresas (nome)")
    .order("nome", { ascending: true });

  if (error) {
    console.error("Error fetching products:", error);
    throw new Error("Failed to fetch products");
  }

  return mapProductData(data);
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
    .select("id, empresa_id, nome, preco, created_at, tipo, tempo_servico, estoque_total, fotos, marca, categoria, empresa:empresas (nome)")
    .eq('tipo', 'produto')
    .order("nome", { ascending: true });

  if (error) {
    console.error("Error fetching products:", error);
    throw new Error("Failed to fetch products");
  }

  return mapProductData(data);
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
    .select("id, empresa_id, nome, preco, created_at, tipo, tempo_servico, estoque_total, fotos, marca, categoria, empresa:empresas (nome)")
    .eq('tipo', 'servico')
    .order("nome", { ascending: true });

  if (error) {
    console.error("Error fetching services:", error);
    throw new Error("Failed to fetch services");
  }

  return mapProductData(data);
};

export const useServicesOnly = () => {
  return useQuery<Product[], Error>({
    queryKey: ["services_only"],
    queryFn: fetchServicesOnly,
  });
};

// --- Fetch Latest Products Only (tipo='produto') ---

const fetchLatestProductsOnly = async (companyId: string | undefined): Promise<Product[]> => {
  let query = supabase
    .from("produtos")
    .select("id, empresa_id, nome, preco, created_at, tipo, tempo_servico, estoque_total, fotos, marca, categoria, empresa:empresas (nome)")
    .eq('tipo', 'produto');
    
  if (companyId) {
    query = query.eq('empresa_id', companyId);
  }
    
  const { data, error } = await query
    .order("created_at", { ascending: false }) // Order by creation date descending
    .limit(10); // Limit to 10

  if (error) {
    console.error("Error fetching latest products:", error);
    throw new Error("Failed to fetch latest products");
  }

  return mapProductData(data);
};

export const useLatestProductsOnly = (companyId: string | undefined) => {
  return useQuery<Product[], Error>({
    queryKey: ["latest_products_only", companyId],
    queryFn: () => fetchLatestProductsOnly(companyId),
    enabled: true, // Sempre habilitado, pois a função lida com companyId opcional
  });
};

// --- Fetch Product by ID (NOVO) ---

const fetchProductById = async (productId: string): Promise<Product | null> => {
  const { data, error } = await supabase
    .from("produtos")
    .select("id, empresa_id, nome, preco, created_at, tipo, tempo_servico, estoque_total, fotos, marca, categoria, empresa:empresas (nome)")
    .eq('id', productId)
    .single();

  if (error) {
    console.error("Error fetching product by ID:", error);
    throw new Error("Failed to fetch product details");
  }

  // Mapeamento para corrigir a tipagem do relacionamento 'empresa'
  const productData = data ? {
    ...data,
    empresa: data.empresa?.[0] || null,
  } : null;

  return productData as Product | null;
};

export const useProductById = (productId: string) => {
  return useQuery<Product | null, Error>({
    queryKey: ["productById", productId],
    queryFn: () => fetchProductById(productId),
    enabled: !!productId,
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

export const deleteProduct = async (id: string, productName: string, productType: ProductType, companyId: string, queryClient: QueryClient) => {
  const { error } = await supabase
    .from("produtos")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting product:", error);
    throw new Error(error.message);
  }
  
  // Notificação de exclusão
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    createNotification({
      user_id: user.id,
      empresa_id: companyId,
      titulo: `${productType === 'produto' ? 'Produto' : 'Serviço'} Excluído`,
      mensagem: `O ${productType === 'produto' ? 'produto' : 'serviço'} '${productName}' (ID: ${id.slice(0, 8)}) foi excluído.`,
      link: productType === 'produto' ? "/products" : "/services",
      queryClient: queryClient,
    });
  }
};