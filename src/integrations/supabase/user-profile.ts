import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";
import { useSession } from "./auth";
import { AccessType } from "./customProfiles"; // Importando AccessType

export interface PermissionMap {
  [moduleName: string]: AccessType;
}

export interface CurrentUserProfile {
  id: string;
  nome_completo: string;
  // perfil_id (global) removido
  avatar_url: string | null;
  telefone: string | null; // Adicionado
  endereco_completo: string | null; // Adicionado
  empresa_id: string | null; // Adicionado
  perfil_customizado_id: string | null; // NOVO: ID do perfil customizado (UUID)
  is_company_active: boolean; // NOVO: Status de ativação da empresa
  perfis: {
    nome: string;
  } | null;
  permissions: PermissionMap; // NOVO: Mapa de permissões
  is_super_admin: boolean; // NOVO: Flag para Super Admin
}

// Função auxiliar para buscar permissões
const fetchPermissions = async (customProfileId: string): Promise<PermissionMap> => {
  const { data, error } = await supabase
    .from("permissao_modulos")
    .select(`
      acesso,
      modulos (nome)
    `)
    .eq('perfil_customizado_id', customProfileId);
    
  if (error) {
    console.error("Error fetching custom permissions:", error);
    return {};
  }
  
  // Mapeia o resultado para um objeto { [moduleName]: accessType }
  const permissionMap: PermissionMap = {};
  data.forEach((p: any) => {
    if (p.modulos?.nome) {
      permissionMap[p.modulos.nome] = p.acesso;
    }
  });
  
  return permissionMap;
};


const fetchCurrentUserProfile = async (userId: string): Promise<CurrentUserProfile | null> => {
  // 1. Buscar dados básicos do usuário (sem perfil_id)
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nome_completo, avatar_url, telefone, endereco_completo, empresa_id, perfil_customizado_id, empresas (is_active)")
    .eq("id", userId)
    .limit(1); 

  if (error) {
    console.error("Error fetching current user profile:", error);
    throw new Error("Failed to fetch user profile");
  }

  const userProfile = data?.[0];
  
  if (!userProfile) return null;
  
  const is_company_active = userProfile.empresas ? userProfile.empresas.is_active : true;
  
  let permissions: PermissionMap = {};
  let is_super_admin = false;
  let profileName = "Funcionário"; // Default name
  
  // 2. Verificar se é Super Admin usando a nova RPC
  const { data: isSaData, error: isSaError } = await supabase.rpc('is_super_admin');
  if (!isSaError && isSaData !== null) {
    is_super_admin = isSaData;
  }
  
  // 3. Lógica de Permissões
  if (is_super_admin) {
    // Se for Super Admin, concedemos acesso total
    is_super_admin = true;
    profileName = "Super Admin";
    permissions = {
      users: 'escrita', clients: 'escrita', products: 'escrita', services: 'escrita', 
      orders: 'escrita', appointments: 'escrita', teams: 'escrita', analytics: 'escrita', 
      companies: 'escrita', notifications: 'escrita', categories: 'escrita',
      custom_profiles: 'escrita', // NOVO MÓDULO
    };
  } else if (userProfile.perfil_customizado_id) {
    // Se tiver um perfil customizado, buscamos as permissões
    permissions = await fetchPermissions(userProfile.perfil_customizado_id);
    
    // 4. Buscar o nome do perfil customizado (usando .limit(1) em vez de .single() para robustez)
    const { data: customProfileData, error: customProfileError } = await supabase
      .from("perfis_customizados")
      .select("nome")
      .eq("id", userProfile.perfil_customizado_id)
      .limit(1);
      
    if (customProfileError) {
        console.error("Error fetching custom profile name:", customProfileError);
    }
      
    profileName = customProfileData?.[0]?.nome || "Perfil Customizado";
  } else {
    // Usuário sem perfil customizado e não é SA (deve ser um erro de configuração)
    profileName = "Sem Perfil";
  }

  return {
    ...userProfile,
    is_company_active: is_company_active,
    is_super_admin: is_super_admin,
    permissions: permissions,
    perfis: { nome: profileName }, // Simula a estrutura perfis (nome)
    empresas: undefined, 
  } as CurrentUserProfile;
};

export const useCurrentUserProfile = () => {
  const { user, isLoading: isAuthLoading } = useSession();
  const userId = user?.id;

  return useQuery<CurrentUserProfile | null, Error>({
    queryKey: ["currentUserProfile", userId],
    queryFn: () => fetchCurrentUserProfile(userId!),
    enabled: !!userId && !isAuthLoading,
  });
};