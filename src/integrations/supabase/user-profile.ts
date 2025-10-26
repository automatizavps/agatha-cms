import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";
import { useSession } from "./auth";

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
  } | null;
  // Permissões removidas, mas mantemos o tipo para evitar quebra em outros lugares
  permissions: {}; 
  is_super_admin: boolean;
}

const fetchCurrentUserProfile = async (userId: string): Promise<CurrentUserProfile | null> => {
  // 1. Buscar dados básicos do usuário (RLS está desabilitado, então todos os dados são visíveis)
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nome_completo, avatar_url, telefone, endereco_completo, empresa_id, perfil_customizado_id, empresas (is_active, nome), perfis_customizados (nome)")
    .eq("id", userId)
    .limit(1)
    .single(); // Adicionando .single() para obter um objeto, não um array

  if (error) {
    console.error("Error fetching current user profile:", error);
    throw new Error("Failed to fetch user profile");
  }

  // O retorno de .single() é um objeto, mas o TS ainda pode reclamar de sub-relacionamentos.
  const userProfile = data;
  
  if (!userProfile) return null;
  
  // Acessando propriedades diretamente, pois o select com alias deve retornar o objeto
  const companyData = Array.isArray(userProfile.empresas) ? userProfile.empresas[0] : userProfile.empresas;
  const profileCustomData = Array.isArray(userProfile.perfis_customizados) ? userProfile.perfis_customizados[0] : userProfile.perfis_customizados;

  const is_company_active = companyData ? companyData.is_active : true;
  
  let is_super_admin = false;
  let profileName = "Funcionário";
  
  // 2. Verificar se é Super Admin (usando a função RPC)
  const { data: isSaData, error: isSaError } = await supabase.rpc('is_super_admin');
  if (!isSaError && isSaData !== null) {
    is_super_admin = isSaData;
  }
  
  // 3. Lógica de Perfil (simplificada, sem buscar permissões)
  if (is_super_admin) {
    profileName = "Super Admin";
  } else if (userProfile.perfil_customizado_id) {
    profileName = profileCustomData?.nome || "Perfil Customizado";
  } else if (userProfile.empresa_id) {
    profileName = "Admin";
  } else {
    profileName = "Usuário Básico";
  }

  return {
    id: userProfile.id,
    nome_completo: userProfile.nome_completo,
    avatar_url: userProfile.avatar_url,
    telefone: userProfile.telefone,
    endereco_completo: userProfile.endereco_completo,
    empresa_id: userProfile.empresa_id,
    perfil_customizado_id: userProfile.perfil_customizado_id,
    is_company_active: is_company_active,
    is_super_admin: is_super_admin,
    permissions: {},
    perfis: { nome: profileName },
    empresas: companyData,
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