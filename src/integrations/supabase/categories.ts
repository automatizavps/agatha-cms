import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";

export interface Category {
  id: string;
  empresa_id: string;
  nome: string;
  created_at: string;
  empresas: { // NOVO: Adicionando relacionamento com a empresa
    nome: string;
  } | null;
}

// --- Fetch ---

const fetchCategories = async (companyId?: string): Promise<Category[]> => {
  // console.log("Fetching categories with companyId:", companyId); // Adicionado log de debug
  let query = supabase
    .from("categorias")
    .select("id, empresa_id, nome, created_at, empresas (nome)"); // Incluindo o nome da empresa
    
  if (companyId) {
    query = query.eq('empresa_id', companyId);
  }

  const { data, error } = await query.order("nome", { ascending: true });

  if (error) {
    console.error("Error fetching categories:", error);
    throw new Error("Failed to fetch categories");
  }

  return data as Category[];
};

export const useCategories = (companyId?: string) => {
  return useQuery<Category[], Error>({
    queryKey: ["categories", companyId],
    queryFn: () => fetchCategories(companyId),
  });
};

// --- Validação de Unicidade ---

/**
 * Verifica se um nome de categoria já existe para uma determinada empresa, excluindo o ID atual (se estiver editando).
 */
export const checkCategoryNameUniqueness = async (
  nome: string, 
  empresa_id: string, 
  excludeId?: string
): Promise<boolean> => {
  let query = supabase
    .from("categorias")
    .select("id")
    .eq('empresa_id', empresa_id)
    .ilike('nome', nome) // Busca case-insensitive
    .limit(1);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error checking category name uniqueness:", error);
    // Em caso de erro, assumimos que é único para não bloquear o usuário
    return true; 
  }

  // Retorna true se for único (data.length === 0)
  return data.length === 0;
};


// --- Create ---

interface CreateCategoryParams {
  nome: string;
  empresa_id?: string; // Opcional: Usado apenas pelo Super Admin
}

export const createCategory = async ({ nome, empresa_id: provided_empresa_id }: CreateCategoryParams) => {
  let empresa_id: string;

  if (provided_empresa_id) {
    empresa_id = provided_empresa_id;
  } else {
    const { data: companyData, error: companyError } = await supabase.rpc('get_user_company_id');
    if (companyError || !companyData) {
      throw new Error("Não foi possível determinar a empresa do usuário.");
    }
    empresa_id = companyData;
  }
  
  if (!empresa_id) {
     throw new Error("ID da empresa é obrigatório para criar uma categoria.");
  }

  // 2. Inserir a categoria
  const { data, error } = await supabase
    .from("categorias")
    .insert({
      empresa_id: empresa_id,
      nome: nome,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating category:", error);
    
    // Tratamento específico para violação de unicidade (código 23505)
    if (error.code === '23505') {
      throw new Error("Já existe uma categoria com este nome nesta empresa.");
    }
    
    throw new Error(error.message);
  }

  return data;
};

// --- Update ---

interface UpdateCategoryParams {
  id: string;
  nome: string;
}

export const updateCategory = async ({ id, nome }: UpdateCategoryParams) => {
  const { data, error } = await supabase
    .from("categorias")
    .update({ nome: nome })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating category:", error);
    
    // Tratamento específico para violação de unicidade (código 23505)
    if (error.code === '23505') {
      throw new Error("Já existe uma categoria com este nome nesta empresa.");
    }
    
    throw new Error(error.message);
  }

  return data;
};

// --- Delete ---

export const deleteCategory = async (id: string) => {
  const { error } = await supabase
    .from("categorias")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting category:", error);
    throw new Error(error.message);
  }
};