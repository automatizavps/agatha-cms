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
  entidade_id: string;
  tipo_valor: CommissionType;
  valor: number;
  created_at: string;
  
  // Relacionamentos (para exibição)
  entidade?: {
    nome: string;
    tipo?: 'produto' | 'servico';
  } | null;
  
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


// --- Fetch Rules ---

const fetchCommissionRules = async (companyId?: string): Promise<CommissionRule[]> => {
  let query = supabase
    .from("comissionamento_regras")
    .select(`
      id,
      empresa_id,
      tipo_entidade,
      entidade_id,
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
  
  // Mapeamento para buscar nomes das entidades (produtos/serviços/categorias)
  const rulesWithEntityNames = await Promise.all(data.map(async (rule) => {
    let entityName: string | null = null;
    let entityType: 'produto' | 'servico' | 'categoria' | undefined = undefined;
    
    if (rule.tipo_entidade === 'produto' || rule.tipo_entidade === 'servico') {
      const { data: productData } = await supabase
        .from('produtos')
        .select('nome, tipo')
        .eq('id', rule.entidade_id)
        .single();
      if (productData) {
        entityName = productData.nome;
        entityType = productData.tipo as 'produto' | 'servico';
      }
    } else if (rule.tipo_entidade === 'categoria') {
      const { data: categoryData } = await supabase
        .from('categorias')
        .select('nome')
        .eq('id', rule.entidade_id)
        .single();
      if (categoryData) {
        entityName = categoryData.nome;
        entityType = 'categoria';
      }
    }
    
    return {
      ...rule,
      valor: parseFloat(String(rule.valor)) || 0,
      entidade: entityName ? { nome: entityName, tipo: entityType } : null,
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


// --- Create Rule ---

interface CreateRuleParams {
  tipo_entidade: EntityType;
  entidade_id: string;
  tipo_valor: CommissionType;
  valor: number;
  empresa_id?: string;
  usuario_ids: string[]; // NOVO
}

export const createCommissionRule = async ({ tipo_entidade, entidade_id, tipo_valor, valor, empresa_id: provided_empresa_id, usuario_ids }: CreateRuleParams) => {
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
      entidade_id: entidade_id,
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
  
  // 2. Gerenciar usuários da regra
  await manageRuleUsers(ruleId, usuario_ids);

  return data;
};

// --- Update Rule ---

interface UpdateRuleParams extends CreateRuleParams {
  id: string;
}

export const updateCommissionRule = async ({ id, tipo_entidade, entidade_id, tipo_valor, valor, usuario_ids }: UpdateRuleParams) => {
  // 1. Atualizar a regra principal
  const { data, error } = await supabase
    .from("comissionamento_regras")
    .update({
      tipo_entidade: tipo_entidade,
      entidade_id: entidade_id,
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
  
  // 2. Gerenciar usuários da regra
  await manageRuleUsers(id, usuario_ids);

  return data;
};

// --- Delete Rule ---

export const deleteCommissionRule = async (id: string, queryClient: QueryClient) => {
  // A exclusão em cascata cuidará dos usuários da regra
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