import { useQuery, useMutation, useQueryClient, QueryClient } from "@tanstack/react-query";
import { supabase } from "./client";
import { createNotification } from "./notifications";
import { AccessType, Module } from "./customProfiles";

export interface PlanModule {
  plano_id: string;
  modulo_id: string;
  acesso: AccessType;
  modulos: Module;
}

export interface Plan {
  id: string;
  nome: string;
  limite_usuarios: number;
  preco: number;
  created_at: string;
  regras?: PlanModule[]; // Opcional, carregado separadamente
}

// --- Fetch Planos ---

const fetchPlans = async (): Promise<Plan[]> => {
  // A RLS garante que apenas o Super Admin possa ver todos os planos
  const { data, error } = await supabase
    .from("planos")
    .select("id, nome, limite_usuarios, preco, created_at")
    .order("nome", { ascending: true });

  if (error) {
    console.error("Error fetching plans:", error);
    throw new Error("Failed to fetch plans");
  }
  
  return data.map(p => ({
    ...p,
    preco: parseFloat(String(p.preco)) || 0,
  })) as Plan[];
};

export const usePlans = () => {
  return useQuery<Plan[], Error>({
    queryKey: ["plans"],
    queryFn: fetchPlans,
  });
};

// --- Fetch Regras de um Plano ---

const fetchPlanModules = async (planId: string): Promise<PlanModule[]> => {
  const { data, error } = await supabase
    .from("plano_modulos")
    .select(`
      plano_id,
      modulo_id,
      acesso,
      modulos (id, nome, descricao)
    `)
    .eq('plano_id', planId);

  if (error) {
    console.error("Error fetching plan modules:", error);
    throw new Error("Failed to fetch plan modules");
  }

  return data as PlanModule[];
};

export const usePlanModules = (planId: string) => {
  return useQuery<PlanModule[], Error>({
    queryKey: ["planModules", planId],
    queryFn: () => fetchPlanModules(planId),
    enabled: !!planId,
  });
};

// --- Create Plan ---

interface CreatePlanParams {
  nome: string;
  limite_usuarios: number;
  preco: number;
  rules: { modulo_id: string; acesso: AccessType }[];
  queryClient: QueryClient;
}

export const createPlan = async ({ nome, limite_usuarios, preco, rules, queryClient }: CreatePlanParams) => {
  // 1. Criar o plano
  const { data: planData, error: planError } = await supabase
    .from("planos")
    .insert({ 
      nome, 
      limite_usuarios, 
      preco 
    })
    .select("id, nome")
    .single();

  if (planError || !planData) {
    console.error("Error creating plan:", planError);
    throw new Error(planError?.message || "Falha ao criar plano.");
  }
  
  const plano_id = planData.id;

  // 2. Inserir as regras de módulo
  const rulesPayload = rules.map(rule => ({
    plano_id,
    modulo_id: rule.modulo_id,
    acesso: rule.acesso,
  }));

  const { error: rulesError } = await supabase
    .from("plano_modulos")
    .insert(rulesPayload);

  if (rulesError) {
    console.error("Error inserting plan rules:", rulesError);
    throw new Error("Plano criado, mas falha ao adicionar regras: " + rulesError.message);
  }
  
  // 3. Notificação (Apenas para Super Admin)
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    createNotification({
      user_id: user.id,
      empresa_id: null,
      titulo: "Novo Plano Criado",
      mensagem: `O plano '${nome}' foi criado com limite de ${limite_usuarios} usuários.`,
      link: "/companies/plans",
      queryClient: queryClient,
    });
  }

  return planData;
};

// --- Update Plan ---

interface UpdatePlanParams extends Omit<CreatePlanParams, 'queryClient'> {
  id: string;
  queryClient: QueryClient;
}

export const updatePlan = async ({ id, nome, limite_usuarios, preco, rules, queryClient }: UpdatePlanParams) => {
  // 1. Atualizar o plano principal
  const { data: planData, error: planError } = await supabase
    .from("planos")
    .update({
      nome: nome,
      limite_usuarios: limite_usuarios,
      preco: preco,
    })
    .eq("id", id)
    .select("id, nome")
    .single();

  if (planError || !planData) {
    console.error("Error updating plan:", planError);
    throw new Error(planError?.message || "Falha ao atualizar plano principal.");
  }
  
  // 2. Deletar regras antigas
  const { error: deleteError } = await supabase
    .from("plano_modulos")
    .delete()
    .eq("plano_id", id);
    
  if (deleteError) {
    console.error("Error deleting old plan rules:", deleteError);
    throw new Error("Falha ao limpar regras antigas: " + deleteError.message);
  }

  // 3. Inserir novas regras
  const rulesPayload = rules.map(rule => ({
    plano_id: id,
    modulo_id: rule.modulo_id,
    acesso: rule.acesso,
  }));

  const { error: insertError } = await supabase
    .from("plano_modulos")
    .insert(rulesPayload);

  if (insertError) {
    console.error("Error inserting new plan rules:", insertError);
    throw new Error("Falha ao inserir novas regras: " + insertError.message);
  }
  
  // 4. Notificação
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    createNotification({
      user_id: user.id,
      empresa_id: null,
      titulo: "Plano Atualizado",
      mensagem: `O plano '${nome}' foi atualizado.`,
      link: "/companies/plans",
      queryClient: queryClient,
    });
  }

  return planData;
};

// --- Delete Plan ---

export const deletePlan = async (id: string, planName: string, queryClient: QueryClient) => {
  // A exclusão em cascata cuidará das regras
  const { error } = await supabase
    .from("planos")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting plan:", error);
    throw new Error(error.message);
  }
  
  // Notificação de exclusão
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    createNotification({
      user_id: user.id,
      empresa_id: null,
      titulo: "Plano Excluído",
      mensagem: `O plano '${planName}' (ID: ${id.slice(0, 8)}) foi excluído.`,
      link: "/companies/plans",
      queryClient: queryClient,
    });
  }
};