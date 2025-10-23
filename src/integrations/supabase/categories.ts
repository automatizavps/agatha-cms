import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";

export interface Category {
  id: string;
  empresa_id: string;
  nome: string;
  created_at: string;
}

// --- Fetch ---

const fetchCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase
    .from("categorias")
    .select("id, empresa_id, nome, created_at")
    .order("nome", { ascending: true });

  if (error) {
    console.error("Error fetching categories:", error);
    throw new Error("Failed to fetch categories");
  }

  return data as Category[];
};

export const useCategories = () => {
  return useQuery<Category[], Error>({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });
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