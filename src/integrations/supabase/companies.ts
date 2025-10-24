import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";

export interface SupabaseCompany { // Renomeado para SupabaseCompany
  id: string;
  nome: string;
  cnpj: string | null;
  dono_id: string | null;
  telefone: string | null;
  endereco_completo: string | null;
  email: string | null;
  created_at: string;
}

// --- Fetch ---

const fetchCompanies = async (): Promise<SupabaseCompany[]> => {
  // A política RLS existente só permite que Admins/Funcionários vejam a própria empresa.
  // Para o Super Admin (ID 1), a política 'Super Admin pode gerenciar todas as empresas' permite SELECT *.
  const { data, error } = await supabase
    .from("empresas")
    .select("id, nome, cnpj, dono_id, telefone, endereco_completo, email, created_at")
    .order("nome", { ascending: true });

  if (error) {
    console.error("Error fetching companies:", error);
    throw new Error("Failed to fetch companies");
  }

  return data as SupabaseCompany[];
};

export const useCompanies = () => {
  return useQuery<SupabaseCompany[], Error>({
    queryKey: ["companies"],
    queryFn: fetchCompanies,
  });
};

// --- Create ---

interface CreateCompanyParams {
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  endereco_completo: string | null;
  email: string | null;
}

export const createCompany = async ({ nome, cnpj, telefone, endereco_completo, email }: CreateCompanyParams) => {
  // O dono_id é o usuário logado (Super Admin)
  const { data: { user } } = await supabase.auth.getUser();
  const dono_id = user?.id;

  if (!dono_id) {
    throw new Error("Usuário não autenticado.");
  }

  // 2. Inserir a empresa
  const { data, error } = await supabase
    .from("empresas")
    .insert({
      nome: nome,
      cnpj: cnpj,
      dono_id: dono_id, // O trigger 'on_empresa_created' usará este ID
      telefone: telefone,
      endereco_completo: endereco_completo,
      email: email,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating company:", error);
    throw new Error(error.message);
  }

  return data;
};

// --- Update ---

interface UpdateCompanyParams {
  id: string;
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  endereco_completo: string | null;
  email: string | null;
}

export const updateCompany = async ({ id, nome, cnpj, telefone, endereco_completo, email }: UpdateCompanyParams) => {
  const { data, error } = await supabase
    .from("empresas")
    .update({
      nome: nome,
      cnpj: cnpj,
      telefone: telefone,
      endereco_completo: endereco_completo,
      email: email,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating company:", error);
    throw new Error(error.message);
  }

  return data;
};

// --- Delete ---

export const deleteCompany = async (id: string) => {
  const { error } = await supabase
    .from("empresas")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting company:", error);
    throw new Error(error.message);
  }
};