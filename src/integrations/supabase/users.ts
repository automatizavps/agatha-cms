import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";

export interface UserProfile {
  id: string;
  nome_completo: string;
  perfil_id: number;
  empresa_id: string | null;
  avatar_url: string | null;
  telefone: string | null; // Novo campo
  endereco_completo: string | null; // Novo campo
  email: string; // Adicionando email
  perfis: {
    nome: string;
  } | null;
  empresa: { // Novo campo para o nome da empresa
    nome: string;
  } | null;
}

const fetchUsers = async (): Promise<UserProfile[]> => {
  // Buscamos dados do perfil e o email do auth.users (usando o relacionamento implícito)
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nome_completo, perfil_id, empresa_id, avatar_url, telefone, endereco_completo, perfis (nome), empresas (nome), auth_users:auth.users (email)") // Incluindo 'auth.users (email)'
    .order("nome_completo", { ascending: true });

  if (error) {
    console.error("Error fetching users:", error);
    throw new Error("Failed to fetch users");
  }
  
  // Mapeamos os dados para a interface UserProfile, extraindo o email
  return data.map(user => ({
    ...user,
    email: user.auth_users?.[0]?.email || 'N/A', // Extrai o email do array de auth_users
    auth_users: undefined, // Remove a propriedade temporária
  })) as UserProfile[];
};

export const useUsers = () => {
  return useQuery<UserProfile[], Error>({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });
};

interface InviteUserParams {
  email: string;
  full_name: string;
  perfil_id: number;
  telefone: string | null; // Novo campo
  endereco_completo: string | null; // Novo campo
  empresa_id?: string; // Opcional, apenas para Super Admin
}

export const inviteUser = async ({ email, full_name, perfil_id, telefone, endereco_completo, empresa_id }: InviteUserParams) => {
  const { data, error } = await supabase.functions.invoke("invite-user", {
    body: { email, full_name, perfil_id, telefone, endereco_completo, empresa_id },
  });

  if (error) {
    console.error("Error inviting user:", error);
    throw new Error(error.message);
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
};

interface UpdateUserParams {
  userIdToUpdate: string;
  full_name: string;
  perfil_id: number;
  telefone: string | null; // Novo campo
  endereco_completo: string | null; // Novo campo
  empresa_id?: string | null; // Opcional, apenas para Super Admin
}

export const updateUser = async ({ userIdToUpdate, full_name, perfil_id, telefone, endereco_completo, empresa_id }: UpdateUserParams) => {
  const { data, error } = await supabase.functions.invoke("update-user", {
    body: { userIdToUpdate, full_name, perfil_id, telefone, endereco_completo, empresa_id },
  });

  if (error) {
    console.error("Error updating user:", error);
    throw new Error(error.message);
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
};

export const deleteUser = async (userIdToDelete: string) => {
  const { data, error } = await supabase.functions.invoke("delete-user", {
    body: { userIdToDelete },
  });

  if (error) {
    console.error("Error deleting user:", error);
    throw new Error(error.message);
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
};