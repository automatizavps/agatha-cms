import { useQuery, QueryClient } from "@tanstack/react-query";
import { supabase } from "./client";
import { createNotification } from "./notifications"; // Importando

export type OrderStatus = 'pendente_entrega' | 'entregue' | 'cancelado';

export interface OrderItem {
  id: string;
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
  // Relacionamento com o produto para obter o nome
  produtos: {
    nome: string;
    tipo: 'produto' | 'servico';
  } | null;
}

export interface Order {
  id: string;
  empresa_id: string;
  cliente_id: string;
  valor_total: number;
  status: OrderStatus;
  created_at: string;
  
  // Relacionamentos
  clientes: {
    nome: string;
    email: string | null;
  } | null;
  
  // Itens do pedido (carregados separadamente ou via join)
  pedido_itens: OrderItem[];
}

// --- Fetch ---

interface OrderFilters {
  startDate?: string; // ISO date string (YYYY-MM-DD)
  endDate?: string;   // ISO date string (YYYY-MM-DD)
}

const fetchOrders = async (companyId?: string, filters: OrderFilters = {}): Promise<Order[]> => {
  // Buscamos pedidos e o nome/email do cliente
  let query = supabase
    .from("pedidos")
    .select(`
      id,
      empresa_id,
      cliente_id,
      valor_total,
      status,
      created_at,
      clientes (nome, email)
    `);
    
  // 1. Filtrar por Empresa
  if (companyId) {
    query = query.eq('empresa_id', companyId);
  }
  
  // 2. Filtrar por Intervalo de Data (created_at)
  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate);
  }
  if (filters.endDate) {
    // Adiciona 1 dia ao endDate para incluir o dia inteiro
    const end = new Date(filters.endDate);
    end.setDate(end.getDate() + 1);
    query = query.lt('created_at', end.toISOString());
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching orders:", error);
    throw new Error("Failed to fetch orders");
  }

  return data as Order[];
};

export const useOrders = (companyId?: string, filters: OrderFilters = {}) => {
  // Adiciona companyId e filtros na queryKey
  return useQuery<Order[], Error>({
    queryKey: ["orders", companyId, filters],
    queryFn: () => fetchOrders(companyId, filters),
  });
};

// --- Fetch Order Items ---

const fetchOrderItems = async (orderId: string): Promise<OrderItem[]> => {
  const { data, error } = await supabase
    .from("pedido_itens")
    .select(`
      id,
      produto_id,
      quantidade,
      preco_unitario,
      produtos (nome, tipo)
    `)
    .eq('pedido_id', orderId);

  if (error) {
    console.error("Error fetching order items:", error);
    throw new Error("Failed to fetch order items");
  }

  return data as OrderItem[];
};

export const useOrderItems = (orderId: string) => {
  return useQuery<OrderItem[], Error>({
    queryKey: ["orderItems", orderId],
    queryFn: () => fetchOrderItems(orderId),
    enabled: !!orderId,
  });
};


// --- Create ---

interface ItemToCreate {
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
}

interface CreateOrderParams {
  cliente_id: string;
  valor_total: number;
  items: ItemToCreate[];
  queryClient: QueryClient; // NOVO: Adicionando QueryClient
  empresa_id?: string; // Opcional para Super Admin
}

export const createOrder = async ({ cliente_id, valor_total, items, queryClient, empresa_id: provided_empresa_id }: CreateOrderParams) => {
  let empresa_id: string;

  if (provided_empresa_id) {
    // Se o ID da empresa foi fornecido (Super Admin), usamos ele.
    empresa_id = provided_empresa_id;
  } else {
    // 1. Obter o ID da empresa do usuário logado (para Admin/Funcionário)
    const { data: companyData, error: companyError } = await supabase.rpc('get_user_company_id');

    if (companyError || !companyData) {
      console.error("Error fetching user company ID:", companyError);
      throw new Error("Não foi possível determinar a empresa do usuário.");
    }
    empresa_id = companyData;
  }
  
  if (!empresa_id) {
     throw new Error("ID da empresa é obrigatório para criar um pedido.");
  }


  // 2. Inserir o pedido principal
  const { data: orderData, error: orderError } = await supabase
    .from("pedidos")
    .insert({
      empresa_id: empresa_id,
      cliente_id: cliente_id,
      valor_total: valor_total,
      status: 'pendente_entrega',
    })
    .select("id")
    .single();

  if (orderError || !orderData) {
    console.error("Error creating order:", orderError);
    throw new Error(orderError?.message || "Falha ao criar pedido principal.");
  }
  
  const pedido_id = orderData.id;

  // 3. Inserir os itens do pedido
  const itemsPayload = items.map(item => ({
    pedido_id: pedido_id,
    produto_id: item.produto_id,
    quantidade: item.quantidade,
    preco_unitario: item.preco_unitario,
  }));

  const { error: itemsError } = await supabase
    .from("pedido_itens")
    .insert(itemsPayload);

  if (itemsError) {
    console.error("Error inserting order items:", itemsError);
    // Se a inserção dos itens falhar, idealmente deveríamos reverter o pedido principal.
    // Por simplicidade, vamos apenas lançar o erro.
    throw new Error("Pedido criado, mas falha ao adicionar itens: " + itemsError.message);
  }
  
  // 4. Criar notificação para o usuário logado
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    createNotification({
      user_id: user.id,
      empresa_id: empresa_id,
      titulo: "Novo Pedido Criado",
      mensagem: `Pedido #${pedido_id.slice(0, 8)} no valor de R$ ${valor_total.toFixed(2)} foi criado.`,
      link: "/orders", // Link para a página de pedidos
      queryClient: queryClient, // Passando o queryClient
    });
  }


  return orderData;
};

// --- Update Status ---

interface UpdateOrderStatusParams {
  id: string;
  status: OrderStatus;
  queryClient: QueryClient; // Adicionando QueryClient aqui também, pois é usado na notificação
}

export const updateOrderStatus = async ({ id, status, queryClient }: UpdateOrderStatusParams) => {
  const { data, error } = await supabase
    .from("pedidos")
    .update({ status: status })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating order status:", error);
    throw new Error(error.message);
  }
  
  // 2. Criar notificação para o usuário logado sobre a atualização
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    createNotification({
      user_id: user.id,
      empresa_id: data.empresa_id,
      titulo: "Status do Pedido Atualizado",
      mensagem: `O status do Pedido #${id.slice(0, 8)} foi alterado para ${status.replace('_', ' ')}.`,
      link: "/orders",
      queryClient: queryClient,
    });
  }
  
  // 3. Invalida queries de estoque e produtos se o status for 'cancelado'
  if (status === 'cancelado') {
    // Invalida queries de produtos (para atualizar o estoque_total)
    queryClient.invalidateQueries({ queryKey: ["products_only"] });
    queryClient.invalidateQueries({ queryKey: ["latest_products_only"] });
    queryClient.invalidateQueries({ queryKey: ["productCount"] });
  }
  
  // 4. Invalida queries de métricas diárias se o status for 'entregue' (ou 'cancelado' se for re-entregue)
  const currentDate = new Date().toISOString().slice(0, 10);
  queryClient.invalidateQueries({ queryKey: ["dailyOrderCountByHour", data.empresa_id, currentDate] });
  queryClient.invalidateQueries({ queryKey: ["revenueMetrics"] });


  return data;
};

// --- Delete ---

export const deleteOrder = async (id: string) => {
  // A exclusão em cascata cuidará dos itens do pedido
  const { error } = await supabase
    .from("pedidos")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting order:", error);
    throw new Error(error.message);
  }
};

// --- Bulk Delete ---
export const deleteOrders = async (orderIds: string[]) => {
  const { error } = await supabase
    .from("pedidos")
    .delete()
    .in("id", orderIds);

  if (error) {
    console.error("Error deleting orders:", error);
    throw new Error(error.message);
  }
};