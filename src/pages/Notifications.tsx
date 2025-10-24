import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, Bell, CheckCheck } from "lucide-react";
import { useNotifications, markAllNotificationsAsRead } from "@/integrations/supabase/notifications";
import { showError, showSuccess } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import NotificationTable from "@/components/NotificationTable";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/integrations/supabase/auth";

const Notifications = () => {
  const { user } = useSession();
  const { data: notifications, isLoading, isError, error, refetch, isRefetching } = useNotifications();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const unreadCount = notifications?.filter(n => !n.lida).length || 0;

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
      showSuccess(t('notifications_marked_read'));
    },
    onError: (error) => {
      showError(t('error_loading_data') + ": " + error.message);
    }
  });

  if (isError && error) {
    showError(t("error_loading_data") + ": " + error.message);
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t('page_title_notifications')}</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
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
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => refetch()} 
            disabled={isRefetching}
          >
            {isRefetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" /> {t('notification_list_title')} ({notifications?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && !isRefetching ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="text-center p-8 space-y-4 border border-destructive rounded-md bg-red-50/50 dark:bg-red-900/10">
              <p className="text-destructive">
                {t('error_loading_data')}
              </p>
            </div>
          ) : notifications && notifications.length > 0 ? (
            <NotificationTable notifications={notifications} />
          ) : (
            <div className="text-center p-4 text-muted-foreground">
              {t('no_notifications_found')}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default Notifications;