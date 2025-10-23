import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";

export interface UserProfile {
  id: string;
  nome_completo: string;
  perfil_id: number;
  empresa_id: string | null;
  avatar_url: string | null;
  perfis: {
    nome: string;
  } | null;
}

const fetchUsers = async (): Promise<UserProfile[]> => {
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nome_completo, perfil_id, empresa_id, avatar_url, perfis (nome)")
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
}

export const inviteUser = async ({ email, full_name, perfil_id }: InviteUserParams) => {
  const { data, error } = await supabase.functions.invoke("invite-user", {
    body: { email, full_name, perfil_id },
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