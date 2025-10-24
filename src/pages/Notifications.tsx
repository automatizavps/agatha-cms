import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, Bell, Search, Trash2, CheckCheck } from "lucide-react";
import { useNotifications, markAllNotificationsAsRead, deleteNotifications } from "@/integrations/supabase/notifications";
import { showError, showSuccess } from "@/utils/toast";
import { PermissionGuard } from "@/hooks/use-permission";
import { Button } from "@/components/ui/button";
import NotificationTable from "@/components/NotificationTable";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import FloatingBulkActions from "@/components/FloatingBulkActions";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import DeleteReadNotificationsDialog from "@/components/DeleteReadNotificationsDialog";

const NotificationsContent = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  
  // --- Pagination & Fetch States ---
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const { data, isLoading, isError, error, refetch, isRefetching } = useNotifications(page, pageSize);
  const notifications = data?.notifications || [];
  const totalCount = data?.totalCount || 0;
  
  // --- Filter States ---
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNotificationIds, setSelectedNotificationIds] = useState<Set<string>>(new Set());
  
  const unreadCount = useMemo(() => notifications.filter(n => !n.lida).length, [notifications]);
  const hasReadNotifications = notifications.some(n => n.lida);

  if (isError && error) {
    showError(t("error_loading_data") + ": " + error.message);
  }
  
  // --- Filtering (Client-side for simplicity with pagination) ---
  const filteredNotifications = useMemo(() => {
    if (!notifications) return [];
    if (!searchTerm) return notifications;

    const lowerCaseSearch = searchTerm.toLowerCase();
    return notifications.filter(n => 
      n.titulo.toLowerCase().includes(lowerCaseSearch) ||
      (n.mensagem && n.mensagem.toLowerCase().includes(lowerCaseSearch))
    );
  }, [notifications, searchTerm]);
  
  // --- Mutations ---
  
  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      showSuccess(t('notifications_marked_read'));
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error) => {
      showError(t('error_loading_data') + ": " + error.message);
    }
  });
  
  const bulkDeleteMutation = useMutation({
    mutationFn: deleteNotifications,
    onSuccess: () => {
      showSuccess(t('notifications_deleted_success', { count: selectedNotificationIds.size }));
      setSelectedNotificationIds(new Set()); // Limpa a seleção
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error) => {
      showError(t('error_loading_data') + ": " + error.message);
    },
  });
  
  const handleBulkDelete = () => {
    if (selectedNotificationIds.size === 0) return;
    
    const count = selectedNotificationIds.size;
    const confirmMessage = count === 1 
      ? t('confirm_delete_single') 
      : t('confirm_delete_bulk', { count });
      
    if (window.confirm(confirmMessage)) {
      bulkDeleteMutation.mutate(Array.from(selectedNotificationIds));
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t('page_title_notifications')}</h1>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => markAllReadMutation.mutate()}
            disabled={unreadCount === 0 || markAllReadMutation.isPending}
          >
            {markAllReadMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="mr-2 h-4 w-4" />
            )}
            {t('mark_all_read')}
          </Button>
          <DeleteReadNotificationsDialog disabled={!hasReadNotifications} />
        </div>
      </div>
      
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" /> {t('notification_list_title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('search_placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                disabled={isLoading && !isRefetching}
              />
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => refetch()} 
              disabled={isRefetching}
              className="ml-2"
            >
              {isRefetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>

          {isLoading && !isRefetching ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="text-center p-8 space-y-4 border border-destructive rounded-md bg-red-50/50 dark:bg-red-900/10">
              <p className="text-destructive">
                {t('error_loading_data')}
              </p>
              <Button onClick={() => refetch()} disabled={isRefetching}>
                {isRefetching ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {t('try_again')}
              </Button>
            </div>
          ) : filteredNotifications.length > 0 ? (
            <NotificationTable 
              notifications={filteredNotifications} 
              selectedIds={selectedNotificationIds}
              onSelectChange={setSelectedNotificationIds}
            />
          ) : (
            <div className="text-center p-4 text-muted-foreground">
              {searchTerm ? t('no_data_found') : t('no_notifications_found')}
            </div>
          )}
          
          {/* Paginação (Simples) */}
          {totalCount > pageSize && (
            <div className="flex justify-between items-center mt-4">
              <Button 
                variant="outline" 
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                disabled={page === 1 || isLoading}
              >
                {t('previous')}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t('page_info', { 
                  start: (page - 1) * pageSize + 1, 
                  end: Math.min(page * pageSize, totalCount), 
                  count: totalCount 
                })}
              </span>
              <Button 
                variant="outline" 
                onClick={() => setPage(p => p + 1)} 
                disabled={page * pageSize >= totalCount || isLoading}
              >
                {t('next')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Componente Flutuante de Ações em Massa */}
      <FloatingBulkActions 
        selectedCount={selectedNotificationIds.size}
        onDelete={handleBulkDelete}
        isDeleting={bulkDeleteMutation.isPending}
      />
    </DashboardLayout>
  );
};

const Notifications = () => (
  // Todos os usuários podem ver suas notificações
  <PermissionGuard allowedProfileIds={[1, 2, 3]}>
    <NotificationsContent />
  </PermissionGuard>
);

export default Notifications;