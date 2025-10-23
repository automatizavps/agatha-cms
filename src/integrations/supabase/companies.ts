import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";

export interface Company {
  id: string;
  nome: string;
  cnpj: string | null;
  dono_id: string | null;
  created_at: string;
}

// --- Fetch ---

const fetchCompanies = async (): Promise<Company[]> => {
  // A política RLS existente só permite que Admins/Funcionários vejam a própria empresa.
  // Para o Super Admin (ID 1), a política 'Super Admin pode gerenciar todas as empresas' permite SELECT *.
  const { data, error } = await supabase
    .from("empresas")
    .select("id, nome, cnpj, dono_id, created_at")
    .order("nome", { ascending: true });

  if (error) {
    console.error("Error fetching companies:", error;
    throw new Error("Failed to fetch companies");
  }

  return data as Company[];
};

export const useCompanies = () => {
  return useQuery<Company[], Error>({
    queryKey: ["companies"],
    queryFn: fetchCompanies,
  });
};

// --- Create ---

interface CreateCompanyParams {
  nome: string;
  cnpj: string | null;
  dono_email: string; // Email do usuário que será o dono/admin inicial
}

export const createCompany = async ({ nome, cnpj, dono_email }: CreateCompanyParams) => {
  // 1. Buscar o ID do usuário pelo email (dono_id)
  // Nota: Esta operação requer privilégios de Service Role, mas como não estamos usando Edge Functions aqui,
  // vamos assumir que o usuário logado é o dono_id (que é o Super Admin) e que ele será o dono inicial.
  // No entanto, a tabela 'empresas' tem uma coluna 'dono_id' que deve ser preenchida.
  
  // Vamos usar o ID do usuário logado como dono_id, e o trigger handle_new_empresa
  // irá configurar o perfil desse usuário como Admin (2) e associá-lo à empresa.
  
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
}

export const updateCompany = async ({ id, nome, cnpj }: UpdateCompanyParams) => {
  const { data, error } = await supabase
    .from("empresas")
    .update({
      nome: nome,
      cnpj: cnpj,
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