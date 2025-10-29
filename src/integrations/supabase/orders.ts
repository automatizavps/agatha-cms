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
  responsavel_id: string | null; // NOVO CAMPO
  valor_total: number;
  status: OrderStatus;
  created_at: string;
  promocao_id: string | null;
  
  // Relacionamentos
  clientes: {
    nome: string;
    email: string | null;
  } | null;
  responsavel: { // NOVO RELACIONAMENTO
    nome_completo: string;
    avatar_url: string | null;
  } | null;
  
  // Itens do pedido (carregados separadamente ou via join)
  pedido_itens: OrderItem[];
}

// --- Fetch Geral ---

interface OrderFilters {
  startDate?: string; // ISO date string (YYYY-MM-DD)
  endDate?: string;   // ISO date string (YYYY-MM-DD)
}

interface PaginatedOrders {
  orders: Order[];
  totalCount: number;
}

const fetchOrders = async (companyId?: string, filters: OrderFilters = {}, page: number = 1, pageSize: number = 20): Promise<PaginatedOrders> => {
  const offset = (page - 1) * pageSize;
  
  // Buscamos pedidos e o nome/email do cliente
  let query = supabase
    .from("pedidos")
    .select(`
      id,
      empresa_id,
      cliente_id,
      responsavel_id,
      valor_total,
      status,
      created_at,
      promocao_id,
      clientes (nome, email),
      responsavel:usuarios!pedidos_responsavel_id_fkey (nome_completo, avatar_url)
    `, { count: 'exact' }); // Solicita a contagem total
    
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

  // 3. Aplicar ordenação e paginação
  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching orders:", error);
    throw new Error("Failed to fetch orders");
  }

  return {
    orders: data as Order[],
    totalCount: count || 0,
  };
};

export const useOrders = (companyId?: string, filters: OrderFilters = {}, page: number = 1, pageSize: number = 20) => {
  // Adiciona companyId, filtros e paginação na queryKey
  return useQuery<PaginatedOrders, Error>({
    queryKey: ["orders", companyId, filters, page, pageSize],
    queryFn: () => fetchOrders(companyId, filters, page, pageSize),
  });
};

// --- Fetch Single Order by ID (NOVO) ---
const fetchOrderById = async (orderId: string): Promise<Order | null> => {
  const { data, error } = await supabase
    .from("pedidos")
    .select(`
      id,
      empresa_id,
      cliente_id,
      responsavel_id,
      valor_total,
      status,
      created_at,
      promocao_id,
      clientes (nome, email, telefone, endereco_completo, avatar_url),
      responsavel:usuarios!pedidos_responsavel_id_fkey (nome_completo, avatar_url),
      empresas (nome),
      pedido_itens (
        id,
        produto_id,
        quantidade,
        preco_unitario,
        produtos (nome, tipo)
      )
    `)
    .eq("id", orderId)
    .single();

  if (error) {
    console.error("Error fetching order by ID:", error);
    throw new Error("Failed to fetch order details: " + error.message);
  }
  
  // Garante que valor_total seja um número
  if (data) {
    data.valor_total = parseFloat(String(data.valor_total)) || 0;
  }

  return data as Order;
};

export const useOrderById = (orderId: string | undefined) => {
  return useQuery<Order | null, Error>({
    queryKey: ["orderById", orderId],
    queryFn: () => fetchOrderById(orderId!),
    enabled: !!orderId,
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
  responsavel_id: string; // NOVO: Responsável é obrigatório na criação
  valor_total: number;
  items: ItemToCreate[];
  queryClient: QueryClient; // NOVO: Adicionando QueryClient
  empresa_id?: string; // Opcional para Super Admin
  promocao_id?: string | null; // NOVO: promocao_id
}

export const createOrder = async ({ cliente_id, responsavel_id, valor_total, items, queryClient, empresa_id: provided_empresa_id, promocao_id }: CreateOrderParams) => {
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
      responsavel_id: responsavel_id, // NOVO CAMPO
      valor_total: valor_total,
      status: 'pendente_entrega',
      promocao_id: promocao_id, // NOVO: promocao_id
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

// --- Update ---

interface UpdateOrderParams {
  id: string;
  cliente_id: string;
  responsavel_id: string; // NOVO CAMPO
  valor_total: number;
  status: OrderStatus;
  promocao_id: string | null; // NOVO: promocao_id
  queryClient: QueryClient; // Adicionando QueryClient aqui também, pois é usado na notificação
}

export const updateOrder = async ({ id, cliente_id, responsavel_id, valor_total, status, promocao_id, queryClient }: UpdateOrderParams) => {
  const { data, error } = await supabase
    .from("pedidos")
    .update({
      cliente_id: cliente_id,
      responsavel_id: responsavel_id, // NOVO CAMPO
      valor_total: valor_total,
      status: status,
      promocao_id: promocao_id, // NOVO: promocao_id
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating order:", error);
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

  // 3. Invalida a query de métricas diárias se o status for 'entregue' ou se mudar de 'entregue'
  // Isso garante que o dashboard seja atualizado quando o estoque é consumido/devolvido.
  if (status === 'entregue' || data.status === 'entregue') {
    const currentDate = new Date().toISOString().slice(0, 10);
    // Invalida a query que alimenta o gráfico de pedidos por hora
    queryClient.invalidateQueries({ queryKey: ["dailyOrderCountByHour", data.empresa_id, currentDate] });
    // Invalida a query de métricas de receita (diária, semanal, mensal)
    queryClient.invalidateQueries({ queryKey: ["revenueMetrics", data.empresa_id, currentDate] });
  }

  return data;
};

// --- Update Status (mantido para compatibilidade, mas updateOrder é mais completo) ---

interface UpdateOrderStatusParams {
  id: string;
  status: OrderStatus;
  queryClient: QueryClient; // Adicionando QueryClient aqui também, pois é usado na notificação
}

export const updateOrderStatus = async ({ id, status, queryClient }: UpdateOrderStatusParams) => {
  // Primeiro, busca o pedido para obter o valor_total, promocao_id e responsavel_id atuais
  const { data: currentOrder, error: fetchError } = await supabase
    .from("pedidos")
    .select("cliente_id, valor_total, promocao_id, empresa_id, responsavel_id") // Incluindo responsavel_id
    .eq("id", id)
    .single();

  if (fetchError || !currentOrder) {
    console.error("Error fetching current order for status update:", fetchError);
    throw new Error(fetchError?.message || "Falha ao buscar pedido para atualização de status.");
  }
  
  // Usamos a função updateOrder completa para garantir que o responsavel_id seja mantido
  return updateOrder({
    id,
    cliente_id: currentOrder.cliente_id,
    responsavel_id: currentOrder.responsavel_id!, // Assumimos que o responsável existe
    valor_total: currentOrder.valor_total,
    status,
    promocao_id: currentOrder.promocao_id,
    queryClient,
  });
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