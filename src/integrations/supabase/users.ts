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
  perfis: {
    nome: string;
  } | null;
}

const fetchUsers = async (): Promise<UserProfile[]> => {
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nome_completo, perfil_id, empresa_id, avatar_url, telefone, endereco_completo, perfis (nome)")
    .order("nome_completo", { ascending: true });

  if (error) {
    console.error("Error fetching users:", error);
    throw new Error("Failed to fetch users");
  }

  return data as UserProfile[];
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