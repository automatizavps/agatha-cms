import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";

export interface UserProfile {
  id: string;
  nome_completo: string;
  empresa_id: string | null;
  avatar_url: string | null;
  telefone: string | null;
  endereco_completo: string | null;
  email: string; // Mantemos o campo, mas será 'N/A' na lista
  perfil_customizado_id: string | null; // ID do perfil customizado (UUID)
  perfis: {
    nome: string;
  } | null;
  empresa: { // Nome da empresa
    nome: string;
  } | null;
}

const fetchUsers = async (): Promise<UserProfile[]> => {
  // Query para buscar usuários, nome da empresa e nome do perfil customizado
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nome_completo, empresa_id, avatar_url, telefone, endereco_completo, perfil_customizado_id, perfis:perfis_customizados (nome), empresa:empresas (nome)")
    .order("nome_completo", { ascending: true });

  if (error) {
    console.error("Error fetching users:", error);
    throw new Error("Failed to fetch users: " + error.message);
  }
  
  // Mapeamos os dados, definindo o email como 'N/A' na lista
  return data.map(user => {
    let profileName = user.perfis?.nome;
    
    // Se não houver perfil customizado, determinamos o perfil global
    if (!user.perfil_customizado_id) {
      if (user.empresa_id === null) {
        profileName = 'Super Admin'; // Antigo SA
      } else {
        profileName = 'Admin'; // Admin de Empresa (sem perfil customizado)
      }
    }
    
    // Se o perfil customizado for 'Super Admin' e tiver empresa_id, ele é o NOVO SA.
    // (Esta lógica é redundante se a RPC is_super_admin for usada, mas mantemos para consistência visual)
    if (profileName === 'Super Admin' && user.empresa_id !== null) {
        profileName = 'Super Admin';
    }
    
    return {
      ...user,
      email: 'N/A', // O email real será buscado no EditUserSheet
      // Mapeia o nome do perfil
      perfis: { nome: profileName || 'N/A' },
    };
  }) as UserProfile[];
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
  perfil_id: string; // Agora é o UUID do perfil customizado ou '1' para SA
  telefone: string | null;
  endereco_completo: string | null;
  empresa_id?: string | null; // Opcional, apenas para Super Admin
}

export const inviteUser = async ({ email, full_name, perfil_id, telefone, endereco_completo, empresa_id }: InviteUserParams) => {
  // A Edge Function agora lida com a lógica de perfil_id ('1' vs UUID)
  const { data, error } = await supabase.functions.invoke("invite-user", {
    body: { email, full_name, perfil_id, telefone, endereco_completo, empresa_id },
    headers: {
      // O token de sessão é adicionado automaticamente pelo cliente Supabase
    },
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
  perfil_id: string; // Agora é o UUID do perfil customizado ou '1' para SA
  telefone: string | null;
  endereco_completo: string | null;
  empresa_id?: string | null; // Opcional, apenas para Super Admin
}

export const updateUser = async ({ userIdToUpdate, full_name, perfil_id, telefone, endereco_completo, empresa_id }: UpdateUserParams) => {
  // A Edge Function agora lida com a lógica de perfil_id ('1' vs UUID)
  const { data, error } = await supabase.functions.invoke("update-user", {
    body: { userIdToUpdate, full_name, perfil_id, telefone, endereco_completo, empresa_id },
    headers: {
      // O token de sessão é adicionado automaticamente pelo cliente Supabase
    },
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
    headers: {
      // O token de sessão é adicionado automaticamente pelo cliente Supabase
    },
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