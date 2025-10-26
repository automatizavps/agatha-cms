import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "./client";
import { createNotification } from "./notifications"; // Importando createNotification
import { QueryClient } from "@tanstack/react-query"; // Importando QueryClient

export type AccessType = 'leitura' | 'escrita' | 'sem_acesso';

export interface Module {
  id: string;
  nome: string;
  descricao: string | null;
}

export interface Permission {
  modulo_id: string;
  acesso: AccessType;
  modulos: Module | null; // Corrigido para objeto único ou null
}

export interface CustomProfile {
  id: string;
  empresa_id: string;
  nome: string;
  created_at: string;
  empresas: { nome: string } | null;
  permissoes?: Permission[]; // Opcional, carregado separadamente
}

// --- Fetch Módulos (Global) ---

const fetchModules = async (): Promise<Module[]> => {
  const { data, error } = await supabase
    .from("modulos")
    .select("id, nome, descricao")
    .order("nome", { ascending: true });

  if (error) {
    console.error("Error fetching modules:", error);
    throw new Error("Failed to fetch modules");
  }

  return data as Module[];
};

export const useModules = () => {
  return useQuery<Module[], Error>({
    queryKey: ["modules"],
    queryFn: fetchModules,
  });
};

// --- Fetch Perfis Customizados ---

const fetchCustomProfiles = async (companyId?: string): Promise<CustomProfile[]> => {
  let query = supabase
    .from("perfis_customizados")
    .select(`
      id,
      empresa_id,
      nome,
      created_at,
      empresas (nome)
    `);
    
  if (companyId) {
    query = query.eq('empresa_id', companyId);
  }

  const { data, error } = await query.order("nome", { ascending: true });

  if (error) {
    console.error("Error fetching custom profiles:", error);
    throw new Error("Failed to fetch custom profiles");
  }

  // Mapeamento para corrigir a tipagem do relacionamento 'empresas'
  return data.map(profile => ({
    ...profile,
    empresas: profile.empresas?.[0] || null,
  })) as CustomProfile[];
};

export const useCustomProfiles = (companyId?: string) => {
  return useQuery<CustomProfile[], Error>({
    queryKey: ["customProfiles", companyId],
    queryFn: () => fetchCustomProfiles(companyId),
  });
};

// --- Fetch Permissões de um Perfil ---

const fetchProfilePermissions = async (profileId: string): Promise<Permission[]> => {
  const { data, error } = await supabase
    .from("permissao_modulos")
    .select(`
      modulo_id,
      acesso,
      modulos (id, nome, descricao)
    `)
    .eq('perfil_customizado_id', profileId);

  if (error) {
    console.error("Error fetching profile permissions:", error);
    throw new Error("Failed to fetch profile permissions");
  }

  // Mapeamento para corrigir a tipagem do relacionamento 'modulos'
  return data.map(permission => ({
    ...permission,
    modulos: permission.modulos?.[0] || null,
  })) as Permission[];
};

export const useProfilePermissions = (profileId: string) => {
  return useQuery<Permission[], Error>({
    queryKey: ["profilePermissions", profileId],
    queryFn: () => fetchProfilePermissions(profileId),
    enabled: !!profileId,
  });
};

// --- Create Profile ---

interface CreateProfileParams {
  empresa_id: string;
  nome: string;
  permissions: { modulo_id: string; acesso: AccessType }[];
}

export const createCustomProfile = async ({ empresa_id, nome, permissions }: CreateProfileParams) => {
  // 1. Criar o perfil customizado
  const { data: profileData, error: profileError } = await supabase
    .from("perfis_customizados")
    .insert({ empresa_id, nome })
    .select("id, nome") // Selecionar nome para o onSuccess
    .single();

  if (profileError || !profileData) {
    console.error("Error creating custom profile:", profileError);
    throw new Error(profileError?.message || "Falha ao criar perfil customizado.");
  }
  
  const perfil_customizado_id = profileData.id;

  // 2. Inserir as permissões
  const permissionsPayload = permissions.map(p => ({
    perfil_customizado_id,
    modulo_id: p.modulo_id,
    acesso: p.acesso,
  }));

  const { error: permissionsError } = await supabase
    .from("permissao_modulos")
    .insert(permissionsPayload);

  if (permissionsError) {
    console.error("Error inserting permissions:", permissionsError);
    // Se falhar, idealmente deveríamos deletar o perfil criado.
    throw new Error("Perfil criado, mas falha ao adicionar permissões: " + permissionsError.message);
  }

  return profileData;
};

// --- Update Profile ---

interface UpdateProfileParams {
  id: string;
  nome: string;
  permissions: { modulo_id: string; acesso: AccessType }[];
}

export const updateCustomProfile = async ({ id, nome, permissions }: UpdateProfileParams) => {
  // 1. Atualizar o nome do perfil
  const { error: profileError } = await supabase
    .from("perfis_customizados")
    .update({ nome })
    .eq("id", id);

  if (profileError) {
    console.error("Error updating custom profile:", profileError);
    throw new Error(profileError.message);
  }

  // 2. Deletar permissões antigas
  const { error: deleteError } = await supabase
    .from("permissao_modulos")
    .delete()
    .eq("perfil_customizado_id", id);
    
  if (deleteError) {
    console.error("Error deleting old permissions:", deleteError);
    throw new Error("Falha ao limpar permissões antigas: " + deleteError.message);
  }

  // 3. Inserir novas permissões
  const permissionsPayload = permissions.map(p => ({
    perfil_customizado_id: id,
    modulo_id: p.modulo_id,
    acesso: p.acesso,
  }));

  const { error: insertError } = await supabase
    .from("permissao_modulos")
    .insert(permissionsPayload);

  if (insertError) {
    console.error("Error inserting new permissions:", insertError);
    throw new Error("Falha ao inserir novas permissões: " + insertError.message);
  }

  return { id, nome };
};

// --- Delete Profile ---

export const deleteCustomProfile = async (id: string, profileName: string, companyId: string, queryClient: QueryClient) => {
  // A exclusão em cascata cuidará das permissões
  const { error } = await supabase
    .from("perfis_customizados")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting custom profile:", error);
    throw new Error(error.message);
  }
  
  // Notificação de exclusão
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    createNotification({
      user_id: user.id,
      empresa_id: companyId,
      titulo: "Perfil Customizado Excluído",
      mensagem: `O perfil '${profileName}' (ID: ${id.slice(0, 8)}) foi excluído.`,
      link: "/companies/profiles",
      queryClient: queryClient,
    });
  }
};