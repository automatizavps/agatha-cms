import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "./client";

export interface Team {
  id: string;
  empresa_id: string;
  nome: string;
  meta_mensal_valor: number;
  meta_mensal_quantidade: number;
  created_at: string;
  
  // Relacionamentos
  empresas: {
    nome: string;
  } | null;
  
  // Membros (carregados separadamente)
  membros?: TeamMember[];
}

export interface TeamMember {
  usuario_id: string;
  usuarios: {
    nome_completo: string;
    avatar_url: string | null;
  } | null;
}

// --- Fetch Teams ---

const fetchTeams = async (): Promise<Team[]> => {
  const { data, error } = await supabase
    .from("equipes")
    .select(`
      id,
      empresa_id,
      nome,
      meta_mensal_valor,
      meta_mensal_quantidade,
      created_at,
      empresas (nome)
    `)
    .order("nome", { ascending: true });

  if (error) {
    console.error("Error fetching teams:", error);
    throw new Error("Failed to fetch teams");
  }

  return data as Team[];
};

export const useTeams = () => {
  return useQuery<Team[], Error>({
    queryKey: ["teams"],
    queryFn: fetchTeams,
  });
};

// --- Fetch Team Members ---

const fetchTeamMembers = async (teamId: string): Promise<TeamMember[]> => {
  const { data, error } = await supabase
    .from("equipe_membros")
    .select(`
      usuario_id,
      usuarios (nome_completo, avatar_url)
    `)
    .eq('equipe_id', teamId);

  if (error) {
    console.error("Error fetching team members:", error);
    throw new Error("Failed to fetch team members");
  }

  return data as TeamMember[];
};

export const useTeamMembers = (teamId: string) => {
  return useQuery<TeamMember[], Error>({
    queryKey: ["teamMembers", teamId],
    queryFn: () => fetchTeamMembers(teamId),
    enabled: !!teamId,
  });
};

// --- Create Team ---

interface CreateTeamParams {
  nome: string;
  meta_mensal_valor: number;
  meta_mensal_quantidade: number;
  empresa_id?: string; // Apenas para Super Admin
}

export const createTeam = async ({ nome, meta_mensal_valor, meta_mensal_quantidade, empresa_id: provided_empresa_id }: CreateTeamParams) => {
  let empresa_id: string | null = provided_empresa_id || null;

  if (!empresa_id) {
    // Obter o ID da empresa do usuário logado (Admin/Funcionário)
    const { data: companyData, error: companyError } = await supabase.rpc('get_user_company_id');
    if (companyError || !companyData) {
      throw new Error("Não foi possível determinar a empresa do usuário.");
    }
    empresa_id = companyData;
  }
  
  if (!empresa_id) {
     throw new Error("ID da empresa é obrigatório para criar uma equipe.");
  }

  const { data, error } = await supabase
    .from("equipes")
    .insert({
      empresa_id: empresa_id,
      nome: nome,
      meta_mensal_valor: meta_mensal_valor,
      meta_mensal_quantidade: meta_mensal_quantidade,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating team:", error);
    throw new Error(error.message);
  }

  return data;
};

// --- Update Team ---

interface UpdateTeamParams {
  id: string;
  nome: string;
  meta_mensal_valor: number;
  meta_mensal_quantidade: number;
}

export const updateTeam = async ({ id, nome, meta_mensal_valor, meta_mensal_quantidade }: UpdateTeamParams) => {
  const { data, error } = await supabase
    .from("equipes")
    .update({
      nome: nome,
      meta_mensal_valor: meta_mensal_valor,
      meta_mensal_quantidade: meta_mensal_quantidade,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating team:", error);
    throw new Error(error.message);
  }

  return data;
};

// --- Delete Team ---

export const deleteTeam = async (id: string) => {
  const { error } = await supabase
    .from("equipes")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting team:", error);
    throw new Error(error.message);
  }
};

// --- Manage Members ---

interface ManageMembersParams {
  teamId: string;
  memberIds: string[]; // Lista completa de IDs de usuários que devem estar na equipe
}

export const updateTeamMembers = async ({ teamId, memberIds }: ManageMembersParams) => {
  // 1. Obter membros atuais
  const { data: currentMembers, error: fetchError } = await supabase
    .from("equipe_membros")
    .select("usuario_id")
    .eq("equipe_id", teamId);

  if (fetchError) {
    throw new Error("Failed to fetch current members: " + fetchError.message);
  }

  const currentMemberIds = currentMembers.map(m => m.usuario_id);

  // 2. Determinar membros a adicionar e remover
  const membersToAdd = memberIds.filter(id => !currentMemberIds.includes(id));
  const membersToRemove = currentMemberIds.filter(id => !memberIds.includes(id));

  const mutations: Promise<any>[] = [];

  // Adicionar novos membros
  if (membersToAdd.length > 0) {
    const insertPayload = membersToAdd.map(usuario_id => ({
      equipe_id: teamId,
      usuario_id: usuario_id,
    }));
    mutations.push(
      supabase.from("equipe_membros").insert(insertPayload)
    );
  }

  // Remover membros
  if (membersToRemove.length > 0) {
    mutations.push(
      supabase.from("equipe_membros")
        .delete()
        .eq("equipe_id", teamId)
        .in("usuario_id", membersToRemove)
    );
  }

  // Executar todas as mutações
  const results = await Promise.all(mutations);
  
  for (const result of results) {
    if (result.error) {
      console.error("Error managing team members:", result.error);
      throw new Error("Failed to update team members: " + result.error.message);
    }
  }

  return { success: true };
};