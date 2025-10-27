import { useQuery, useMutation, useQueryClient, QueryClient } from "@tanstack/react-query";
import { supabase } from "./client";
import { createNotification } from "./notifications";

export type RuleType = 'produto' | 'servico' | 'categoria' | 'cliente';

export interface PromotionRule {
  id: string;
  promocao_id: string;
  tipo_regra: RuleType;
  entidade_id: string;
  created_at: string;
}

export interface Promotion {
  id: string;
  empresa_id: string;
  nome: string;
  data_inicio: string; // ISO string
  data_fim: string;   // ISO string
  desconto_percentual: number;
  created_at: string;
  
  // Relacionamentos (opcionais para a lista principal)
  empresas: { nome: string } | null;
  regras?: PromotionRule[]; // Carregado separadamente ou em detalhes
}

// --- Fetch Promotions ---

const fetchPromotions = async (companyId?: string): Promise<Promotion[]> => {
  let query = supabase
    .from("promocoes")
    .select(`
      id,
      empresa_id,
      nome,
      data_inicio,
      data_fim,
      desconto_percentual,
      created_at,
      empresas (nome)
    `);
    
  if (companyId) {
    query = query.eq('empresa_id', companyId);
  }

  const { data, error } = await query.order("data_fim", { ascending: false });

  if (error) {
    console.error("Error fetching promotions:", error);
    throw new Error("Failed to fetch promotions");
  }

  return data.map(p => ({
    ...p,
    desconto_percentual: parseFloat(p.desconto_percentual),
  })) as Promotion[];
};

export const usePromotions = (companyId?: string) => {
  return useQuery<Promotion[], Error>({
    queryKey: ["promotions", companyId],
    queryFn: () => fetchPromotions(companyId),
  });
};

// --- Fetch Promotion Rules ---

const fetchPromotionRules = async (promotionId: string): Promise<PromotionRule[]> => {
  const { data, error } = await supabase
    .from("promocao_regras")
    .select(`id, promocao_id, tipo_regra, entidade_id, created_at`)
    .eq('promocao_id', promotionId);

  if (error) {
    console.error("Error fetching promotion rules:", error);
    throw new Error("Failed to fetch promotion rules");
  }

  return data as PromotionRule[];
};

export const usePromotionRules = (promotionId: string) => {
  return useQuery<PromotionRule[], Error>({
    queryKey: ["promotionRules", promotionId],
    queryFn: () => fetchPromotionRules(promotionId),
    enabled: !!promotionId,
  });
};


// --- Create Promotion ---

interface CreatePromotionParams {
  nome: string;
  data_inicio: Date;
  data_fim: Date;
  desconto_percentual: number;
  rules: { tipo_regra: RuleType; entidade_id: string }[];
  queryClient: QueryClient;
  empresa_id?: string; // Opcional para Super Admin
}

export const createPromotion = async ({ nome, data_inicio, data_fim, desconto_percentual, rules, queryClient, empresa_id: provided_empresa_id }: CreatePromotionParams) => {
  let empresa_id: string;

  if (provided_empresa_id) {
    empresa_id = provided_empresa_id;
  } else {
    const { data: companyData, error: companyError } = await supabase.rpc('get_user_company_id');
    if (companyError || !companyData) {
      throw new Error("Não foi possível determinar a empresa do usuário.");
    }
    empresa_id = companyData;
  }
  
  if (!empresa_id) {
     throw new Error("ID da empresa é obrigatório para criar uma promoção.");
  }

  // 1. Inserir a promoção principal
  const { data: promotionData, error: promotionError } = await supabase
    .from("promocoes")
    .insert({
      empresa_id: empresa_id,
      nome: nome,
      data_inicio: data_inicio.toISOString(),
      data_fim: data_fim.toISOString(),
      desconto_percentual: desconto_percentual,
    })
    .select("id")
    .single();

  if (promotionError || !promotionData) {
    console.error("Error creating promotion:", promotionError);
    throw new Error(promotionError?.message || "Falha ao criar promoção principal.");
  }
  
  const promocao_id = promotionData.id;

  // 2. Inserir as regras de promoção
  if (rules.length > 0) {
    const rulesPayload = rules.map(rule => ({
      promocao_id: promocao_id,
      tipo_regra: rule.tipo_regra,
      entidade_id: rule.entidade_id,
    }));

    const { error: rulesError } = await supabase
      .from("promocao_regras")
      .insert(rulesPayload);

    if (rulesError) {
      console.error("Error inserting promotion rules:", rulesError);
      // Não lançamos erro fatal, mas avisamos
      createNotification({
        user_id: (await supabase.auth.getUser()).data.user?.id || '',
        empresa_id: empresa_id,
        titulo: "Aviso: Regras de Promoção Incompletas",
        mensagem: `A promoção '${nome}' foi criada, mas houve falha ao adicionar algumas regras.`,
        link: "/promotions",
        queryClient: queryClient,
      });
    }
  }
  
  // 3. Criar notificação
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    createNotification({
      user_id: user.id,
      empresa_id: empresa_id,
      titulo: "Nova Promoção Criada",
      mensagem: `A promoção '${nome}' com ${desconto_percentual}% de desconto foi criada.`,
      link: "/promotions",
      queryClient: queryClient,
    });
  }

  return promotionData;
};

// --- Update Promotion ---

interface UpdatePromotionParams {
  id: string;
  nome: string;
  data_inicio: Date;
  data_fim: Date;
  desconto_percentual: number;
  rules: { tipo_regra: RuleType; entidade_id: string }[];
  queryClient: QueryClient;
}

export const updatePromotion = async ({ id, nome, data_inicio, data_fim, desconto_percentual, rules, queryClient }: UpdatePromotionParams) => {
  // 1. Atualizar a promoção principal
  const { data: promotionData, error: promotionError } = await supabase
    .from("promocoes")
    .update({
      nome: nome,
      data_inicio: data_inicio.toISOString(),
      data_fim: data_fim.toISOString(),
      desconto_percentual: desconto_percentual,
    })
    .eq("id", id)
    .select("empresa_id")
    .single();

  if (promotionError || !promotionData) {
    console.error("Error updating promotion:", promotionError);
    throw new Error(promotionError?.message || "Falha ao atualizar promoção principal.");
  }
  
  // 2. Deletar regras antigas
  const { error: deleteError } = await supabase
    .from("promocao_regras")
    .delete()
    .eq("promocao_id", id);
    
  if (deleteError) {
    console.error("Error deleting old promotion rules:", deleteError);
    throw new Error("Falha ao limpar regras antigas: " + deleteError.message);
  }

  // 3. Inserir novas regras
  if (rules.length > 0) {
    const rulesPayload = rules.map(rule => ({
      promocao_id: id,
      tipo_regra: rule.tipo_regra,
      entidade_id: rule.entidade_id,
    }));

    const { error: insertError } = await supabase
      .from("promocao_regras")
      .insert(rulesPayload);

    if (insertError) {
      console.error("Error inserting new promotion rules:", insertError);
      throw new Error("Falha ao inserir novas regras: " + insertError.message);
    }
  }
  
  // 4. Criar notificação
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    createNotification({
      user_id: user.id,
      empresa_id: promotionData.empresa_id,
      titulo: "Promoção Atualizada",
      mensagem: `A promoção '${nome}' foi atualizada.`,
      link: "/promotions",
      queryClient: queryClient,
    });
  }

  return { id, nome };
};

// --- Delete Promotion ---

export const deletePromotion = async (id: string, promotionName: string, companyId: string, queryClient: QueryClient) => {
  // A exclusão em cascata cuidará das regras
  const { error } = await supabase
    .from("promocoes")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting promotion:", error);
    throw new Error(error.message);
  }
  
  // Notificação de exclusão
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    createNotification({
      user_id: user.id,
      empresa_id: companyId,
      titulo: "Promoção Excluída",
      mensagem: `A promoção '${promotionName}' (ID: ${id.slice(0, 8)}) foi excluída.`,
      link: "/promotions",
      queryClient: queryClient,
    });
  }
};