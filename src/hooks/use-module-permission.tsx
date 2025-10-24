import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { AccessType } from "@/integrations/supabase/customProfiles";

/**
 * Hook para verificar o nível de acesso do usuário logado a um módulo específico.
 * @param moduleName O nome do módulo (ex: 'users', 'products', 'analytics').
 * @returns O nível de acesso ('leitura', 'escrita', 'sem_acesso') ou 'sem_acesso' se não for Super Admin e não tiver perfil customizado.
 */
export const useModulePermission = (moduleName: string): AccessType => {
  const { data: profile, isLoading } = useCurrentUserProfile();

  if (isLoading || !profile) {
    return 'sem_acesso';
  }
  
  // 1. Super Admin tem acesso total (escrita)
  if (profile.is_super_admin) {
    return 'escrita';
  }
  
  // 2. Usuários com perfil customizado ou Admin de Empresa (que recebem permissões no useCurrentUserProfile)
  return profile.permissions[moduleName] || 'sem_acesso';
};

/**
 * Verifica se o usuário tem pelo menos permissão de leitura.
 */
export const useCanRead = (moduleName: string): boolean => {
  const access = useModulePermission(moduleName);
  return access === 'leitura' || access === 'escrita';
};

/**
 * Verifica se o usuário tem permissão de escrita (que implica leitura).
 */
export const useCanWrite = (moduleName: string): boolean => {
  const access = useModulePermission(moduleName);
  return access === 'escrita';
};