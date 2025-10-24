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
  empresas: { // NOVO: Nome da empresa
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

// Lista de todos os módulos para conceder acesso total
const ALL_MODULES: string[] = [
  'users', 'clients', 'products', 'services', 
  'orders', 'appointments', 'teams', 'analytics', 
  'companies', 'notifications', 'categories', 'custom_profiles'
];


const fetchCurrentUserProfile = async (userId: string): Promise<CurrentUserProfile | null> => {
  // 1. Buscar dados básicos do usuário (incluindo nome da empresa e nome do perfil customizado)
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nome_completo, avatar_url, telefone, endereco_completo, empresa_id, perfil_customizado_id, empresas (is_active, nome), perfis_customizados (nome)")
    .eq("id", userId)
    .limit(1); 

  if (error) {
    console.error("Error fetching current user profile:", error);
    throw new Error("Failed to fetch user profile");
  }

  const userProfile = data?.[0];
  
  if (!userProfile) return null;
  
  const is_company_active = userProfile.empresas ? userProfile.empresas.is_active : true;
  const companyName = userProfile.empresas?.nome || null;
  
  let permissions: PermissionMap = {};
  let is_super_admin = false;
  let profileName = "Funcionário";
  
  // 2. Verificar se é o ANTIGO Super Admin (empresa_id = NULL e perfil_customizado_id = NULL)
  const { data: isSaData, error: isSaError } = await supabase.rpc('is_super_admin');
  if (!isSaError && isSaData !== null) {
    is_super_admin = isSaData;
  }
  
  // 3. Verificar se é o NOVO Super Admin (empresa_id IS NOT NULL E perfil_customizado.nome = 'Super Admin')
  const isNewSuperAdmin = 
    userProfile.empresa_id !== null && 
    userProfile.perfil_customizado_id !== null && 
    userProfile.perfis_customizados?.nome === 'Super Admin';
    
  // O flag final de Super Admin é a união dos dois (para permitir a transição)
  const finalIsSuperAdmin = is_super_admin || isNewSuperAdmin;
  
  // 4. Lógica de Permissões
  if (finalIsSuperAdmin) {
    // Se for Super Admin (antigo ou novo), concedemos acesso total
    profileName = "Super Admin";
    
    // Concede acesso de escrita a todos os módulos
    permissions = ALL_MODULES.reduce((acc, moduleName) => {
      acc[moduleName] = 'escrita';
      return acc;
    }, {} as PermissionMap);
    
  } else if (userProfile.perfil_customizado_id) {
    // Se tiver um perfil customizado (e não for o SA), buscamos as permissões
    permissions = await fetchPermissions(userProfile.perfil_customizado_id);
    profileName = userProfile.perfis_customizados?.nome || "Perfil Customizado";
  } else {
    // Usuário sem perfil customizado e não é SA (deve ser um erro de configuração, provavelmente Admin de Empresa)
    profileName = "Admin"; // Assumimos Admin se tiver empresa_id mas não perfil customizado
  }

  return {
    ...userProfile,
    is_company_active: is_company_active,
    is_super_admin: finalIsSuperAdmin,
    permissions: permissions,
    perfis: { nome: profileName }, // Simula a estrutura perfis (nome)
    empresas: userProfile.empresas, // Mantém o objeto empresas completo
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