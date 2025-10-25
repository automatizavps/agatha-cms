import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "./client";
import { useSession } from "./auth";

export interface UserProfile {
  id: string;
  nome_completo: string;
  empresa_id: string | null;
  avatar_url: string | null;
  telefone: string | null;
  endereco_completo: string | null;
  email: string; 
  perfil_customizado_id: string | null;
  perfis: {
    nome: string;
  } | null;
  empresa: {
    nome: string;
  } | null;
}

// --- Fetch Users ---

const fetchUsers = async (): Promise<UserProfile[]> => {
  // RLS should handle filtering by company_id automatically for non-Super Admins.
  // Super Admins see all users.
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nome_completo, empresa_id, avatar_url, telefone, endereco_completo, perfil_customizado_id, perfis:perfis_customizados (nome), empresa:empresas (nome)")
    .order("nome_completo", { ascending: true });

  if (error) {
    console.error("Error fetching users:", error);
    throw new Error("Failed to fetch users: " + error.message);
  }
  
  // Fetch emails separately (only accessible by Admin/SA via RLS on auth.users)
  const userIds = data.map(u => u.id);
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000, // Assuming less than 1000 users in total for simplicity
  });
  
  if (authError) {
    console.warn("Warning: Failed to fetch auth users for emails:", authError);
    // Continue without emails if fetching fails
  }
  
  const emailMap = new Map<string, string>();
  if (authUsers?.users) {
    authUsers.users.forEach(u => {
      if (userIds.includes(u.id)) {
        emailMap.set(u.id, u.email || 'N/A');
      }
    });
  }
  
  // Map profile names and inject emails
  return data.map(user => {
    let profileName = user.perfis?.nome;
    
    if (!user.perfil_customizado_id) {
      if (user.empresa_id === null) {
        profileName = 'Super Admin';
      } else {
        profileName = 'Admin';
      }
    }
    
    return {
      ...user,
      email: emailMap.get(user.id) || 'N/A', 
      perfis: { nome: profileName || 'N/A' },
    };
  }) as UserProfile[];
};

export const useUsers = (companyId?: string) => {
  // Adiciona companyId na queryKey para forçar o refetch se o Super Admin mudar o filtro
  return useQuery<UserProfile[], Error>({
    queryKey: ["users", companyId],
    queryFn: fetchUsers,
    enabled: true,
  });
};

// --- Invite User (via Edge Function) ---

interface InviteUserParams {
  email: string;
  full_name: string;
  telefone: string | null;
  endereco_completo: string | null;
  perfil_id: string; // UUID do perfil customizado ou '1' para Super Admin
  empresa_id: string; // UUID da empresa
}

export const inviteUser = async (params: InviteUserParams) => {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  
  if (!accessToken) {
    throw new Error("Sessão de administrador ausente.");
  }
  
  const { data, error } = await supabase.functions.invoke("invite-user", {
    body: params,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) {
    console.error("Error inviting user via Edge Function:", error);
    throw new Error(error.message);
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
};

// --- Update User Profile (Admin/SA editing another user) ---

interface UpdateUserParams {
  id: string;
  nome_completo: string;
  telefone: string | null;
  endereco_completo: string | null;
  perfil_customizado_id: string | null; // UUID do perfil customizado ou null (para Admin/SA)
  empresa_id: string | null; // Apenas Super Admin pode mudar
}

export const updateUserProfileByAdmin = async ({ id, nome_completo, telefone, endereco_completo, perfil_customizado_id, empresa_id }: UpdateUserParams) => {
  const updatePayload: Record<string, any> = {
    nome_completo,
    telefone,
    endereco_completo,
    perfil_customizado_id,
  };
  
  // Apenas permite a atualização do empresa_id se for fornecido (Super Admin)
  if (empresa_id !== undefined) {
    updatePayload.empresa_id = empresa_id;
  }
  
  // 1. Atualizar a tabela 'usuarios' (RLS garante que apenas Admins/SA podem fazer isso)
  const { data, error } = await supabase
    .from("usuarios")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating user profile by admin:", error);
    throw new Error(error.message);
  }
  
  // 2. Atualizar metadados do auth.users (para consistência e para o trigger handle_new_user)
  // Nota: Isso requer o Service Role Key, o que é complexo. 
  // Por enquanto, vamos confiar que a tabela 'usuarios' é a fonte de verdade para nome/perfil.
  // Se o email precisar ser alterado, precisaremos de outra Edge Function.
  
  return data;
};

// --- Delete User (via Edge Function) ---

export const deleteUser = async (userIdToDelete: string) => {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  
  if (!accessToken) {
    throw new Error("Sessão de administrador ausente.");
  }
  
  // Usamos a Edge Function de delete-company para garantir que a exclusão do Auth seja feita
  // e que o Admin não possa se excluir.
  
  const { data, error } = await supabase.functions.invoke("delete-user", {
    body: { userIdToDelete },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) {
    console.error("Error deleting user via Edge Function:", error);
    throw new Error(error.message);
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
};