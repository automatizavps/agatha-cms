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
  // 1. Buscar dados básicos do usuário (incluindo nome da empresa)
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nome_completo, avatar_url, telefone, endereco_completo, empresa_id, perfil_customizado_id, empresas (is_active, nome)") // Adicionado 'nome' da empresa
    .eq("id", userId)
    .limit(1); 

  if (error) {
    console.error("Error fetching current user profile:", error);
    throw new Error("Failed to fetch user profile");
  }

  const userProfile = data?.[0];
  
  if (!userProfile) return null;
  
  const is_company_active = userProfile.empresas ? userProfile.empresas.is_active : true;
  const companyName = userProfile.empresas?.nome || null; // Extrai o nome da empresa
  
  let permissions: PermissionMap = {};
  let is_super_admin = false;
  let profileName = "Funcionário"; // Default name
  
  // 2. Verificar se é Super Admin
  const { data: isSaData, error: isSaError } = await supabase.rpc('is_super_admin');
  if (!isSaError && isSaData !== null) {
    is_super_admin = isSaData;
  }
  
  // 3. Verificar se pertence à empresa de Acesso Total
  const { data: isFullAccessCompany, error: isFullAccessError } = await supabase.rpc('is_full_access_company_user');
  const hasFullAccessOverride = !isFullAccessError && isFullAccessCompany === true;
  
  // 4. Lógica de Permissões
  if (is_super_admin || hasFullAccessOverride) {
    // Se for Super Admin OU pertencer à empresa de Acesso Total, concedemos acesso total
    if (is_super_admin) {
      profileName = "Super Admin";
    } else {
      profileName = `${companyName} (Acesso Total)`;
    }
    
    // Concede acesso de escrita a todos os módulos
    permissions = ALL_MODULES.reduce((acc, moduleName) => {
      acc[moduleName] = 'escrita';
      return acc;
    }, {} as PermissionMap);
    
  } else if (userProfile.perfil_customizado_id) {
    // Se tiver um perfil customizado, buscamos as permissões
    permissions = await fetchPermissions(userProfile.perfil_customizado_id);
    
    // 5. Buscar o nome do perfil customizado (usando .limit(1) em vez de .single() para robustez)
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