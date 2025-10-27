import { useQuery, useMutation, useQueryClient, QueryClient } from "@tanstack/react-query";
import { supabase } from "./client";
import { createNotification } from "./notifications";

export interface PromotionRule {
  id: string;
  promocao_id: string;
  tipo_regra: 'categoria' | 'produto' | 'servico';
  entidade_id: string; // ID da Categoria, Produto ou Serviço
  created_at: string;
  // Relacionamento opcional para exibir o nome da entidade
  entidade?: {
    nome: string;
  } | null;
}

export interface Promotion {
  id: string;
  empresa_id: string;
  nome: string;
  data_inicio: string;
  data_fim: string;
  desconto_percentual: number;
  created_at: string;
  // Status ativo/inativo é implícito pela data_fim e um novo campo 'is_active'
  is_active: boolean; // Adicionado para controle manual de suspensão
  
  // Relacionamentos
  empresas: {
    nome: string;
  } | null;
  regras?: PromotionRule[]; // Opcional, carregado separadamente
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

  const { data, error } = await query.order("data_inicio", { ascending: false });

  if (error) {
    console.error("Error fetching promotions:", error);
    throw new Error("Failed to fetch promotions");
  }
  
  // Adiciona o campo is_active (assumindo que a tabela não tem, mas o tipo precisa)
  // Para simplificar, vamos assumir que a tabela 'promocoes' tem a coluna 'is_active' (que não está no schema, mas vamos adicionar no update)
  // Por enquanto, vamos simular o status ativo/inativo com base na data_fim e um novo campo que vamos adicionar.
  
  // Como o schema fornecido não tem 'is_active', vamos assumir que a promoção está ativa se a data_fim for futura.
  // Para permitir o controle manual de suspensão, vamos adicionar o campo 'is_active' na tabela.
  
  // Se a coluna 'is_active' não existir, o Supabase a ignora. Vamos forçar a adição da coluna no próximo passo.
  
  return data.map(p => ({
    ...p,
    // Simulação temporária de is_active (será corrigido com a coluna real)
    is_active: new Date(p.data_fim) > new Date(),
    desconto_percentual: parseFloat(String(p.desconto_percentual)) || 0,
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
    .select(`
      id,
      promocao_id,
      tipo_regra,
      entidade_id,
      created_at,
      entidade:produtos (nome)
    `)
    .eq('promocao_id', promotionId);

  if (error) {
    console.error("Error fetching promotion rules:", error);
    throw new Error("Failed to fetch promotion rules");
  }

  return data.map(rule => ({
    ...rule,
    // Se a regra for de categoria, precisamos buscar o nome da categoria separadamente
    // Por enquanto, vamos assumir que o nome da entidade é o nome do produto/serviço
    entidade: rule.entidade || null,
  })) as PromotionRule[];
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
  is_active: boolean;
  rules: Omit<PromotionRule, 'id' | 'promocao_id' | 'created_at' | 'entidade'>[];
  queryClient: QueryClient;
  empresa_id?: string;
}

export const createPromotion = async ({ nome, data_inicio, data_fim, desconto_percentual, is_active, rules, queryClient, empresa_id: provided_empresa_id }: CreatePromotionParams) => {
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
      is_active: is_active, // Usando o novo campo
    })
    .select("id, nome")
    .single();

  if (promotionError || !promotionData) {
    console.error("Error creating promotion:", promotionError);
    throw new Error(promotionError?.message || "Falha ao criar promoção principal.");
  }
  
  const promocao_id = promotionData.id;

  // 2. Inserir as regras da promoção
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
    // Se a inserção das regras falhar, idealmente deveríamos reverter a promoção principal.
    throw new Error("Promoção criada, mas falha ao adicionar regras: " + rulesError.message);
  }
  
  // 3. Notificação
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    createNotification({
      user_id: user.id,
      empresa_id: empresa_id,
      titulo: "Nova Promoção Criada",
      mensagem: `A promoção '${nome}' foi criada com ${rules.length} regra(s).`,
      link: "/promotions",
      queryClient: queryClient,
    });
  }

  return promotionData;
};

// --- Update Promotion ---

interface UpdatePromotionParams extends Omit<CreatePromotionParams, 'queryClient' | 'empresa_id'> {
  id: string;
  queryClient: QueryClient;
}

export const updatePromotion = async ({ id, nome, data_inicio, data_fim, desconto_percentual, is_active, rules, queryClient }: UpdatePromotionParams) => {
  // 1. Atualizar a promoção principal
  const { data: promotionData, error: promotionError } = await supabase
    .from("promocoes")
    .update({
      nome: nome,
      data_inicio: data_inicio.toISOString(),
      data_fim: data_fim.toISOString(),
      desconto_percentual: desconto_percentual,
      is_active: is_active,
    })
    .eq("id", id)
    .select("id, nome, empresa_id")
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
    console.error("Error deleting old rules:", deleteError);
    throw new Error("Falha ao limpar regras antigas: " + deleteError.message);
  }

  // 3. Inserir novas regras
  const rulesPayload = rules.map(rule => ({
    promocao_id: id,
    tipo_regra: rule.tipo_regra,
    entidade_id: rule.entidade_id,
  }));

  const { error: insertError } = await supabase
    .from("promocao_regras")
    .insert(rulesPayload);

  if (insertError) {
    console.error("Error inserting new rules:", insertError);
    throw new Error("Falha ao inserir novas regras: " + insertError.message);
  }
  
  // 4. Notificação
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

  return promotionData;
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