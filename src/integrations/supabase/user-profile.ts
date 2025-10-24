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
  perfil_id: number;
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
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nome_completo, perfil_id, avatar_url, telefone, endereco_completo, empresa_id, perfil_customizado_id, perfis (nome), empresas (is_active)")
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
  
  // Se houver um perfil customizado, buscamos as permissões
  if (userProfile.perfil_customizado_id) {
    permissions = await fetchPermissions(userProfile.perfil_customizado_id);
  } else if (userProfile.perfil_id === 1) {
    // Se for Super Admin (ID 1), concedemos acesso total a todos os módulos conhecidos
    // Isso é um fallback seguro para o Super Admin
    permissions = {
      users: 'escrita', clients: 'escrita', products: 'escrita', services: 'escrita', 
      orders: 'escrita', appointments: 'escrita', teams: 'escrita', analytics: 'escrita', 
      companies: 'escrita', notifications: 'escrita', categories: 'escrita',
    };
  }

  return {
    ...userProfile,
    is_company_active: is_company_active,
    permissions: permissions,
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