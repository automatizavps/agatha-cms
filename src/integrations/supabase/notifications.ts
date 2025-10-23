import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

// --- Fetch Notifications ---

const fetchNotifications = async (userId: string): Promise<Notification[]> => {
  // RLS garante que apenas as notificações do usuário logado sejam retornadas
  const { data, error } = await supabase
    .from("notificacoes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20); // Limita a 20 notificações recentes

  if (error) {
    console.error("Error fetching notifications:", error);
    throw new Error("Failed to fetch notifications");
  }

  return data as Notification[];
};

export const useNotifications = () => {
  const { user, isLoading: isAuthLoading } = useSession();
  const userId = user?.id;

  return useQuery<Notification[], Error>({
    queryKey: ["notifications", userId],
    queryFn: () => fetchNotifications(userId!),
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

// --- Create Notification Utility (for internal use in mutations) ---

interface CreateNotificationParams {
  user_id: string;
  empresa_id: string | null;
  titulo: string;
  mensagem?: string;
  link?: string;
}

export const createNotification = async ({ user_id, empresa_id, titulo, mensagem, link }: CreateNotificationParams) => {
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
  const queryClient = new useQueryClient();
  queryClient.invalidateQueries({ queryKey: ["notifications", user_id] });
};