import { useQuery, useMutation, useQueryClient, QueryClient } from "@tanstack/react-query";
import { supabase } from "./client";
import { useSession } from "./auth";

export interface Notification {
  id: string;
  user_id: string;
  empresa_id: string | null;
  titulo: string;
  mensagem: string | null;
  link: string | null;
  lida: boolean;
  created_at: string;
}

interface PaginatedNotifications {
  notifications: Notification[];
  totalCount: number;
}

// --- Fetch Notifications ---

const fetchNotifications = async (userId: string, page: number, pageSize: number): Promise<PaginatedNotifications> => {
  const offset = (page - 1) * pageSize;
  
  // RLS garante que apenas as notificações do usuário logado sejam retornadas
  const { data, error, count } = await supabase
    .from("notificacoes")
    .select("*", { count: 'exact' }) // Solicita a contagem total
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1); // Aplica paginação

  if (error) {
    console.error("Error fetching notifications:", error);
    throw new Error("Failed to fetch notifications");
  }

  return {
    notifications: data as Notification[],
    totalCount: count || 0,
  };
};

export const useNotifications = (page: number = 1, pageSize: number = 20) => {
  const { user, isLoading: isAuthLoading } = useSession();
  const userId = user?.id;

  return useQuery<PaginatedNotifications, Error>({
    queryKey: ["notifications", userId, page, pageSize],
    queryFn: () => fetchNotifications(userId!, page, pageSize),
    enabled: !!userId && !isAuthLoading,
  });
};

// --- Mark as Read ---

export const markNotificationAsRead = async (notificationId: string) => {
  const { error } = await supabase
    .from("notificacoes")
    .update({ lida: true })
    .eq("id", notificationId);

  if (error) {
    console.error("Error marking notification as read:", error);
    throw new Error(error.message);
  }
};

// --- Mark All as Read ---

export const markAllNotificationsAsRead = async () => {
  // RLS garante que apenas as notificações do usuário logado sejam atualizadas
  const { error } = await supabase
    .from("notificacoes")
    .update({ lida: true })
    .eq("lida", false);

  if (error) {
    console.error("Error marking all notifications as read:", error);
    throw new Error(error.message);
  }
};

// --- Delete Notification ---

export const deleteNotification = async (notificationId: string) => {
  const { error } = await supabase
    .from("notificacoes")
    .delete()
    .eq("id", notificationId);

  if (error) {
    console.error("Error deleting notification:", error);
    throw new Error(error.message);
  }
};

// --- Create Notification Utility (for internal use in mutations) ---

interface CreateNotificationParams {
  user_id: string;
  empresa_id: string | null;
  titulo: string;
  mensagem?: string;
  link?: string;
  queryClient: QueryClient; // Adicionando QueryClient
}

export const createNotification = async ({ user_id, empresa_id, titulo, mensagem, link, queryClient }: CreateNotificationParams) => {
  const { error } = await supabase
    .from("notificacoes")
    .insert({
      user_id,
      empresa_id,
      titulo,
      mensagem,
      link,
      lida: false,
    });

  if (error) {
    console.error("Error creating notification:", error);
    // Não lançamos erro aqui para não interromper a mutação principal
  }
  
  // Invalida a query de notificações para atualizar o sino
  queryClient.invalidateQueries({ queryKey: ["notifications", user_id] });
};