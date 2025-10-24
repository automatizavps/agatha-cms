import React, { useMemo } from 'react';
import { Bell, Loader2, CheckCheck, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useNotifications, markNotificationAsRead, markAllNotificationsAsRead, Notification } from '@/integrations/supabase/notifications';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError } from '@/utils/toast';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useDashboardFilter } from '@/hooks/useDashboardFilter'; // Importando o hook de filtro

const NotificationItem: React.FC<{ notification: Notification }> = ({ notification }) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  const markReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", notification.user_id] });
    },
    onError: (error) => {
      console.error("Failed to mark notification as read:", error);
    }
  });
  
  const handleMarkRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notification.lida && !markReadMutation.isPending) {
      markReadMutation.mutate(notification.id);
    }
  };
  
  const content = (
    <div 
      className={cn(
        "flex flex-col p-3 border-b hover:bg-accent/50 transition-colors",
        !notification.lida ? "bg-primary/5 dark:bg-primary/10" : "text-muted-foreground"
      )}
      onClick={handleMarkRead}
    >
      <div className="flex justify-between items-start">
        <h4 className={cn("font-semibold text-sm", !notification.lida && "text-foreground")}>
          {notification.titulo}
        </h4>
        {!notification.lida && (
          <div className="h-2 w-2 bg-red-500 rounded-full flex-shrink-0 mt-1" />
        )}
      </div>
      <p className="text-xs mt-1">{notification.mensagem}</p>
      <p className="text-xs mt-1 text-muted-foreground">
        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
      </p>
    </div>
  );
  
  if (notification.link) {
    return (
      <Link to={notification.link} onClick={handleMarkRead}>
        {content}
      </Link>
    );
  }
  
  return content;
};


export function NotificationBell() {
  const { data: notifications, isLoading, isError } = useNotifications();
  const { filteredCompanyId, isSuperAdmin } = useDashboardFilter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  // 1. Filtrar notificações com base no filtro de empresa (se Super Admin)
  const filteredNotifications = useMemo(() => {
    if (!notifications) return [];
    
    // Se não for Super Admin, ou se o filtro estiver em 'all' (filteredCompanyId é undefined),
    // mostramos todas as notificações do usuário logado.
    if (!isSuperAdmin || !filteredCompanyId) {
      return notifications;
    }
    
    // Se for Super Admin e houver um filtro ativo, filtramos:
    // a) Notificações que não têm empresa_id (globais/sistema)
    // b) Notificações que têm empresa_id correspondente ao filtro
    return notifications.filter(n => 
      !n.empresa_id || n.empresa_id === filteredCompanyId
    );
  }, [notifications, filteredCompanyId, isSuperAdmin]);
  
  const unreadCount = useMemo(() => {
    return filteredNotifications.filter(n => !n.lida).length || 0;
  }, [filteredNotifications]);
  
  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      showSuccess(t('notifications_marked_read'));
    },
    onError: (error) => {
      showError(t('error_loading_data') + ": " + error.message);
    }
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-red-500 flex items-center justify-center text-xs text-white">
              {/* O ponto vermelho é suficiente, sem número para manter o ícone pequeno */}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex justify-between items-center p-4">
          <h3 className="text-lg font-semibold">{t('nav_notifications')} ({unreadCount})</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => markAllReadMutation.mutate()}
            disabled={unreadCount === 0 || markAllReadMutation.isPending}
            className="text-xs h-auto p-1"
          >
            {markAllReadMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4 mr-1" />
            )}
            {t('mark_all_read')}
          </Button>
        </div>
        <Separator />
        
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="p-4 text-center text-destructive">
            {t('chart_error')}
          </div>
        ) : filteredNotifications.length > 0 ? (
          <>
            <ScrollArea className="h-[300px]">
              {filteredNotifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} />
              ))}
            </ScrollArea>
            <Separator />
            <div className="p-2">
              <Link to="/notifications" className="flex items-center justify-center text-sm text-primary hover:text-primary/80">
                <ExternalLink className="h-4 w-4 mr-2" />
                {t('view_all_notifications')}
              </Link>
            </div>
          </>
        ) : (
          <div className="p-4 text-center text-muted-foreground">
            {t('no_notifications_found')}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}