import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";
import { useSession } from "./auth";
import i18n from 'i18next'; // Importando i18n para tradução

export interface CurrentUserProfile {
  id: string;
  nome_completo: string;
  avatar_url: string | null;
  telefone: string | null;
  endereco_completo: string | null;
  empresa_id: string | null;
  perfil_customizado_id: string | null;
  is_company_active: boolean;
  perfis: {
    nome: string;
  } | null;
  empresas: {
    nome: string;
    planos: { // NOVO: Incluindo o relacionamento com planos
      nome: string;
    } | null;
  } | null;
  // Permissões removidas, mas mantemos o tipo para evitar quebra em outros lugares
  permissions: {}; 
  is_super_admin: boolean;
}

const fetchCurrentUserProfile = async (userId: string): Promise<CurrentUserProfile | null> => {
  // 1. Buscar dados básicos do usuário (RLS está desabilitado, então todos os dados são visíveis)
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nome_completo, avatar_url, telefone, endereco_completo, empresa_id, perfil_customizado_id, empresas (is_active, nome, planos (nome)), perfis_customizados (nome)")
    .eq("id", userId)
    .limit(1); 

  if (error) {
    console.error("Error fetching current user profile:", error);
    throw new Error("Failed to fetch user profile");
  }

  const userProfile = data?.[0];
  
  if (!userProfile) return null;
  
  const is_company_active = userProfile.empresas ? userProfile.empresas.is_active : true;
  
  let is_super_admin = false;
  let profileName = i18n.t('profile_role_employee'); // Default fallback: Funcionário
  
  // 2. Verificar se é Super Admin (usando a função RPC)
  const { data: isSaData, error: isSaError } = await supabase.rpc('is_super_admin');
  if (!isSaError && isSaData !== null) {
    is_super_admin = isSaData;
  }
  
  // 3. Lógica de Perfil
  if (is_super_admin) {
    profileName = "Super Admin";
  } else if (userProfile.empresa_id && userProfile.perfil_customizado_id === null) {
    // Usuário com empresa, mas sem perfil customizado = Admin de Empresa
    profileName = i18n.t('profile_role_admin'); // Administrador
  } else if (userProfile.perfil_customizado_id) {
    // Usuário com perfil customizado
    profileName = userProfile.perfis_customizados?.nome || i18n.t('unknown_profile');
  } else if (userProfile.empresa_id === null) {
    // Usuário sem empresa e sem perfil customizado (Usuário Básico)
    profileName = i18n.t('profile_role_basic');
  }


  return {
    ...userProfile,
    is_company_active: is_company_active,
    is_super_admin: is_super_admin,
    permissions: {}, // Vazio, pois RLS foi removido
    perfis: { nome: profileName },
    empresas: userProfile.empresas,
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