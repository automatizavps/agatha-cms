import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Bell, Trash2, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useNotifications } from "@/hooks/use-notifications";
import { Notification } from "@/types/notification";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FloatingBulkActions } from "@/components/FloatingBulkActions";
import { useToast } from "@/components/ui/use-toast";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const NotificationItem: React.FC<{ notification: Notification; onToggle: (id: string) => void }> = ({
  notification,
  onToggle,
}) => {
  const { t } = useTranslation();
  const isSelected = notification.isSelected || false;

  return (
    <div
      className={`flex items-start p-4 transition-colors hover:bg-accent/50 ${
        notification.lida ? "opacity-70" : "bg-primary-foreground/10"
      }`}
    >
      <div className="flex items-center h-5 mr-4">
        <Checkbox
          id={`notification-${notification.id}`}
          checked={isSelected}
          onCheckedChange={() => onToggle(notification.id)}
          className="mt-1"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <Link to={notification.link || "#"} className="block w-full">
            <p className={`font-semibold ${notification.lida ? "text-muted-foreground" : "text-foreground"}`}>
              {notification.titulo}
            </p>
            <p className="text-sm text-muted-foreground truncate">{notification.mensagem}</p>
          </Link>
        </div>
        <div className="mt-1 text-xs text-gray-500">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
        </div>
      </div>
      {!notification.lida && (
        <span className="ml-4 flex-shrink-0 h-2 w-2 rounded-full bg-primary" title={t("unread")} />
      )}
    </div>
  );
};

const NotificationsPage: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const {
    notifications,
    isLoading,
    error,
    markAsRead,
    deleteNotifications,
    toggleSelect,
    toggleSelectAll,
    selectedCount,
    hasUnread,
    markAllAsRead,
    isMutating,
  } = useNotifications();

  const selectedIds = useMemo(() => notifications.filter(n => n.isSelected).map(n => n.id), [notifications]);
  const hasSelected = selectedCount > 0;
  const allSelected = notifications.length > 0 && selectedCount === notifications.length;

  const handleMarkAsRead = async () => {
    if (selectedIds.length === 0) return;
    await markAsRead(selectedIds);
    toast({
      title: t("notifications.success_read_title"),
      description: t("notifications.success_read_description", { count: selectedIds.length }),
    });
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;
    await deleteNotifications(selectedIds);
    toast({
      title: t("notifications.success_delete_title"),
      description: t("notifications.success_delete_description", { count: selectedIds.length }),
      variant: "destructive",
    });
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    toast({
      title: t("notifications.success_read_all_title"),
      description: t("notifications.success_read_all_description"),
    });
  };

  const unreadCount = notifications.filter(n => !n.lida).length;

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <AlertTitle>{t("notifications.error_loading_title")}</AlertTitle>
          <AlertDescription>{t("notifications.error_loading_description")}</AlertDescription>
        </Alert>
      );
    }

    if (notifications.length === 0) {
      return (
        <div className="text-center py-10 text-muted-foreground">
          <Bell className="h-10 w-10 mx-auto mb-3" />
          <p>{t("notifications.no_notifications")}</p>
        </div>
      );
    }

    return (
      // Removendo qualquer div de rolagem aqui para garantir que a rolagem seja da janela
      <div className="divide-y divide-border">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onToggle={toggleSelect}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-6 w-6" />
            {t("notifications.title")}
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                {unreadCount} {t("notifications.unread_count")}
              </span>
            )}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleMarkAllAsRead} 
              disabled={!hasUnread || isMutating}
            >
              {isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              {t("notifications.mark_all_read")}
            </Button>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          <div className="flex items-center p-4 border-b bg-secondary/30">
            <div className="flex items-center h-5 mr-4">
              <Checkbox
                id="select-all"
                checked={allSelected}
                onCheckedChange={toggleSelectAll}
                disabled={notifications.length === 0 || isMutating}
              />
            </div>
            <label htmlFor="select-all" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {t("notifications.select_all")} ({selectedCount}/{notifications.length})
            </label>
          </div>
          
          {renderContent()}
          
        </CardContent>
      </Card>

      {/* Floating Bulk Actions é renderizado aqui, no nível da página, fora da Card. */}
      {hasSelected && (
        <FloatingBulkActions selectedCount={selectedCount}>
          <Button 
            onClick={handleMarkAsRead} 
            disabled={isMutating}
            className="bg-green-600 hover:bg-green-700"
          >
            <Check className="mr-2 h-4 w-4" />
            {t("notifications.mark_read")}
          </Button>
          <Button 
            onClick={handleDelete} 
            disabled={isMutating}
            variant="destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t("notifications.delete")}
          </Button>
        </FloatingBulkActions>
      )}
    </div>
  );
};

export default NotificationsPage;