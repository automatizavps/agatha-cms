import { useQuery, useMutation, useQueryClient, QueryClient } from "@tanstack/react-query";
import { supabase } from "./client";
import { createNotification } from "./notifications";
import { AccessType } from "./customProfiles";

export type CommissionType = 'fixo' | 'percentual';
export type EntityType = 'produto' | 'servico' | 'categoria';

export interface CommissionRule {
  id: string;
  empresa_id: string;
  tipo_entidade: EntityType;
  // REMOVIDO: entidade_id
  tipo_valor: CommissionType;
  valor: number;
  created_at: string;
  
  // NOVO: Lista de IDs de entidades associadas (para edição)
  entidade_ids?: string[]; 
  
  // Relacionamentos (para exibição na tabela)
  entidades?: {
    id: string;
    nome: string;
    tipo?: 'produto' | 'servico' | 'categoria';
  }[];
  
  // NOVO: Nome da empresa
  empresas: {
    nome: string;
  } | null;
}

export interface RuleUser {
  usuario_id: string;
  usuarios: {
    nome_completo: string;
  } | null;
}

// --- Fetch Rule Users ---

const fetchRuleUsers = async (ruleId: string): Promise<RuleUser[]> => {
  const { data, error } = await supabase
    .from("comissionamento_regras_usuarios")
    .select(`
      usuario_id,
      usuarios (nome_completo)
    `)
    .eq('regra_id', ruleId);

  if (error) {
    console.error("Error fetching rule users:", error);
    throw new Error("Failed to fetch rule users");
  }

  return data as RuleUser[];
};

export const useRuleUsers = (ruleId: string) => {
  return useQuery<RuleUser[], Error>({
    queryKey: ["ruleUsers", ruleId],
    queryFn: () => fetchRuleUsers(ruleId),
    enabled: !!ruleId,
  });
};

// --- Fetch Rule Entities (NOVO) ---

const fetchRuleEntities = async (ruleId: string): Promise<{ id: string; nome: string; tipo: EntityType }[]> => {
  const { data: ruleEntities, error } = await supabase
    .from("comissionamento_regras_entidades")
    .select(`
      entidade_id
    `)
    .eq('regra_id', ruleId);

  if (error) {
    console.error("Error fetching rule entities:", error);
    throw new Error("Failed to fetch rule entities");
  }
  
  if (!ruleEntities || ruleEntities.length === 0) return [];
  
  const entityIds = ruleEntities.map(e => e.entidade_id);
  
  // Busca os nomes das entidades em lote (simplificado, mas funcional)
  const { data: productsData } = await supabase
    .from('produtos')
    .select('id, nome, tipo')
    .in('id', entityIds);
    
  const { data: categoriesData } = await supabase
    .from('categorias')
    .select('id, nome')
    .in('id', entityIds);
    
  const entitiesMap = new Map<string, { id: string; nome: string; tipo: EntityType }>();
  
  productsData?.forEach(p => entitiesMap.set(p.id, { id: p.id, nome: p.nome, tipo: p.tipo as EntityType }));
  categoriesData?.forEach(c => entitiesMap.set(c.id, { id: c.id, nome: c.nome, tipo: 'categoria' }));
  
  // Retorna apenas as entidades que foram encontradas
  return Array.from(entitiesMap.values());
};

export const useRuleEntities = (ruleId: string) => {
  return useQuery<{ id: string; nome: string; tipo: EntityType }[], Error>({
    queryKey: ["ruleEntities", ruleId],
    queryFn: () => fetchRuleEntities(ruleId),
    enabled: !!ruleId,
  });
};


// --- Fetch Rules ---

const fetchCommissionRules = async (companyId?: string): Promise<CommissionRule[]> => {
  let query = supabase
    .from("comissionamento_regras")
    .select(`
      id,
      empresa_id,
      tipo_entidade,
      tipo_valor,
      valor,
      created_at,
      empresas (nome)
    `);
    
  if (companyId) {
    query = query.eq('empresa_id', companyId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching commission rules:", error);
    throw new Error("Failed to fetch commission rules");
  }
  
  // Para a tabela, buscamos as entidades associadas para exibição
  const rulesWithEntityNames = await Promise.all(data.map(async (rule) => {
    const entities = await fetchRuleEntities(rule.id);
    
    return {
      ...rule,
      valor: parseFloat(String(rule.valor)) || 0,
      entidades: entities,
    };
  }));

  return rulesWithEntityNames as CommissionRule[];
};

export const useCommissionRules = (companyId?: string) => {
  return useQuery<CommissionRule[], Error>({
    queryKey: ["commissionRules", companyId],
    queryFn: () => fetchCommissionRules(companyId),
  });
};

// --- Manage Rule Users (Internal Helper) ---

const manageRuleUsers = async (ruleId: string, userIds: string[]) => {
  // 1. Deletar todos os usuários existentes para esta regra
  const { error: deleteError } = await supabase
    .from("comissionamento_regras_usuarios")
    .delete()
    .eq("regra_id", ruleId);
    
  if (deleteError) {
    throw new Error("Falha ao limpar usuários antigos da regra: " + deleteError.message);
  }
  
  // 2. Inserir novos usuários (se houver)
  if (userIds.length > 0) {
    const insertPayload = userIds.map(usuario_id => ({
      regra_id: ruleId,
      usuario_id: usuario_id,
    }));
    
    const { error: insertError } = await supabase
      .from("comissionamento_regras_usuarios")
      .insert(insertPayload);
      
    if (insertError) {
      throw new Error("Falha ao inserir novos usuários na regra: " + insertError.message);
    }
  }
};

// --- Manage Rule Entities (NOVO) ---

const manageRuleEntities = async (ruleId: string, entityIds: string[]) => {
  // 1. Deletar todas as entidades existentes para esta regra
  const { error: deleteError } = await supabase
    .from("comissionamento_regras_entidades")
    .delete()
    .eq("regra_id", ruleId);
    
  if (deleteError) {
    throw new Error("Falha ao limpar entidades antigas da regra: " + deleteError.message);
  }
  
  // 2. Inserir novas entidades (se houver)
  if (entityIds.length > 0) {
    const insertPayload = entityIds.map(entidade_id => ({
      regra_id: ruleId,
      entidade_id: entidade_id,
    }));
    
    const { error: insertError } = await supabase
      .from("comissionamento_regras_entidades")
      .insert(insertPayload);
      
    if (insertError) {
      throw new Error("Falha ao inserir novas entidades na regra: " + insertError.message);
    }
  }
};


// --- Create Rule ---

interface CreateRuleParams {
  tipo_entidade: EntityType;
  entidade_ids: string[]; // NOVO: Múltiplos IDs
  tipo_valor: CommissionType;
  valor: number;
  empresa_id?: string;
  usuario_ids: string[];
}

export const createCommissionRule = async ({ tipo_entidade, entidade_ids, tipo_valor, valor, empresa_id: provided_empresa_id, usuario_ids }: CreateRuleParams) => {
  let empresa_id: string;

  if (provided_empresa_id) {
    empresa_id = provided_empresa_id;
  } else {
    const { data: companyData, error: companyError } = await supabase.rpc('get_user_company_id');
    if (companyError || !companyData) {
      throw new Error("Não foi possível determinar a empresa do usuário.");
    }
    empresa_id = companyData;
    if (!empresa_id) {
      throw new Error("ID da empresa é obrigatório para criar uma regra.");
    }
  }
  
  // 1. Inserir a regra principal
  const { data, error } = await supabase
    .from("comissionamento_regras")
    .insert({
      empresa_id: empresa_id,
      tipo_entidade: tipo_entidade,
      tipo_valor: tipo_valor,
      valor: valor,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating commission rule:", error);
    throw new Error(error.message);
  }
  
  const ruleId = data.id;
  
  // 2. Gerenciar entidades da regra
  await manageRuleEntities(ruleId, entidade_ids);
  
  // 3. Gerenciar usuários da regra
  await manageRuleUsers(ruleId, usuario_ids);

  return data;
};

// --- Update Rule ---

interface UpdateRuleParams extends CreateRuleParams {
  id: string;
}

export const updateCommissionRule = async ({ id, tipo_entidade, entidade_ids, tipo_valor, valor, usuario_ids }: UpdateRuleParams) => {
  // 1. Atualizar a regra principal
  const { data, error } = await supabase
    .from("comissionamento_regras")
    .update({
      tipo_entidade: tipo_entidade,
      tipo_valor: tipo_valor,
      valor: valor,
    })
    .eq("id", id)
    .select("id")
    .single();

  if (error) {
    console.error("Error updating commission rule:", error);
    throw new Error(error.message);
  }
  
  // 2. Gerenciar entidades da regra
  await manageRuleEntities(id, entidade_ids);
  
  // 3. Gerenciar usuários da regra
  await manageRuleUsers(id, usuario_ids);

  return data;
};

// --- Delete Rule ---

export const deleteCommissionRule = async (id: string, queryClient: QueryClient) => {
  // A exclusão em cascata cuidará dos usuários e entidades da regra
  const { error } = await supabase
    .from("comissionamento_regras")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting commission rule:", error);
    throw new Error(error.message);
  }
};

// --- Fetch Comissionamentos (Calculados) ---

export interface CommissionRecord {
  id: string;
  usuario_id: string;
  referencia_id: string;
  tipo_referencia: 'pedido' | 'agendamento';
  valor_comissao: number;
  status: 'pendente' | 'pago' | 'cancelado';
  created_at: string;
  
  // Relacionamentos
  usuarios: {
    nome_completo: string;
  } | null;
}

export const useCommissionRecords = (companyId?: string) => {
  return useQuery<CommissionRule[], Error>({
    queryKey: ["commissionRules", companyId],
    queryFn: () => fetchCommissionRules(companyId),
  });
};