import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";
import { createNotification } from "./notifications"; // Importando createNotification
import { QueryClient } from "@tanstack/react-query"; // Importando QueryClient
import { useSession } from "./auth"; // Importando useSession

export interface UserProfile {
  id: string;
  nome_completo: string;
  // perfil_id (global) removido
  empresa_id: string | null;
  avatar_url: string | null;
  telefone: string | null; // Novo campo
  endereco_completo: string | null; // Novo campo
  email: string; // Mantemos o campo, mas será 'N/A' na lista
  perfil_customizado_id: string | null; // NOVO: ID do perfil customizado (UUID)
  perfis: {
    nome: string;
  } | null;
  empresa: { // Novo campo para o nome da empresa
    nome: string;
  } | null;
}

// Função auxiliar para buscar e-mails em lote
const fetchEmailsInBatch = async (userIds: string[], accessToken: string): Promise<Record<string, string>> => {
  if (userIds.length === 0) return {};
  
  const { data, error } = await supabase.functions.invoke("get-users-emails", {
    body: { userIds },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) {
    console.error("Error fetching user emails in batch:", error);
    throw new Error(error.message);
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data.emails || {};
};


const fetchUsers = async (accessToken: string): Promise<UserProfile[]> => {
  // 1. Buscar dados básicos do usuário (RLS já filtra por empresa)
  const { data: usersData, error: fetchError } = await supabase
    .from("usuarios")
    .select("id, nome_completo, empresa_id, avatar_url, telefone, endereco_completo, perfil_customizado_id, perfis:perfis_customizados (nome), empresa:empresas (nome)")
    .order("nome_completo", { ascending: true });

  if (fetchError) {
    console.error("Error fetching users:", fetchError);
    throw new Error("Failed to fetch users: " + fetchError.message);
  }
  
  const userIds = usersData.map(u => u.id);
  
  // 2. Buscar e-mails em lote
  const emailMap = await fetchEmailsInBatch(userIds, accessToken);
  
  // 3. Mapear e-mails e perfis
  return usersData.map(user => {
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
    if (profileName === 'Super Admin' && user.empresa_id !== null) {
        profileName = 'Super Admin';
    }
    
    return {
      ...user,
      email: emailMap[user.id] || 'N/A', // Adiciona o email
      // Mapeia o nome do perfil
      perfis: { nome: profileName || 'N/A' },
    };
  }) as UserProfile[];
};

export const useUsers = () => {
  const { session, isLoading: isAuthLoading } = useSession();
  const accessToken = session?.access_token;
  
  return useQuery<UserProfile[], Error>({
    queryKey: ["users"],
    queryFn: () => fetchUsers(accessToken!),
    enabled: !!accessToken && !isAuthLoading,
  });
};

interface InviteUserParams {
  email: string;
  full_name: string;
  perfil_id: string; // Agora é o UUID do perfil customizado
  telefone: string | null; // Novo campo
  endereco_completo: string | null; // Novo campo
  empresa_id?: string; // Opcional, apenas para Super Admin
}

export const inviteUser = async ({ email, full_name, perfil_id, telefone, endereco_completo, empresa_id }: InviteUserParams) => {
  
  // 1. Determinar o ID da empresa alvo
  let target_empresa_id: string | undefined = empresa_id;
  if (!target_empresa_id) {
    const { data: companyData, error: companyError } = await supabase.rpc('get_user_company_id');
    if (companyError || !companyData) {
      throw new Error("Não foi possível determinar a empresa do usuário logado.");
    }
    target_empresa_id = companyData;
  }
  
  if (!target_empresa_id) {
    throw new Error("ID da empresa é obrigatório para convidar um usuário.");
  }
  
  // 2. Verificar o limite de usuários do plano
  const { data: limitCheck, error: limitError } = await supabase.rpc('check_user_limit', { company_id_input: target_empresa_id });
  
  if (limitError) {
    console.error("Error checking user limit:", limitError);
    throw new Error("Falha ao verificar o limite de usuários do plano.");
  }
  
  if (limitCheck === false) {
    throw new Error("Limite de usuários atingido para o plano atual da empresa. Atualize o plano para adicionar mais usuários.");
  }
  
  // 3. Invocar a Edge Function para convite
  const { data, error } = await supabase.functions.invoke("invite-user", {
    body: { email, full_name, perfil_id, telefone, endereco_completo, empresa_id: target_empresa_id },
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
  perfil_id: string; // Agora é o UUID do perfil customizado ou '1' para Antigo SA
  telefone: string | null; // Novo campo
  endereco_completo: string | null; // Novo campo
  empresa_id?: string | null; // Opcional, apenas para Super Admin
}

export const updateUser = async ({ userIdToUpdate, full_name, perfil_id, telefone, endereco_completo, empresa_id }: UpdateUserParams) => {
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

export const deleteUser = async (userIdToDelete: string, userName: string, companyId: string | null, queryClient: QueryClient) => {
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
  
  // Notificação de exclusão (após sucesso da Edge Function)
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    createNotification({
      user_id: user.id,
      empresa_id: companyId,
      titulo: "Usuário Excluído",
      mensagem: `O usuário '${userName}' (ID: ${userIdToDelete.slice(0, 8)}) foi excluído.`,
      link: "/users",
      queryClient: queryClient,
    });
  }

  return data;
};