import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, Bell, CheckCheck, Building } from "lucide-react";
import { useNotifications, markAllNotificationsAsRead } from "@/integrations/supabase/notifications";
import { showError, showSuccess } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import NotificationTable from "@/components/NotificationTable";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/integrations/supabase/auth";
import { useDashboardFilter } from "@/hooks/useDashboardFilter";
import { useCompanies } from "@/integrations/supabase/companies";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo } from "react";

const Notifications = () => {
  const { user } = useSession();
  const { data: notifications, isLoading, isError, error, refetch, isRefetching } = useNotifications();
  const { isSuperAdmin, selectedCompanyId, setSelectedCompanyId, filteredCompanyId, isLoadingFilter } = useDashboardFilter();
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
  
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const isChecking = isLoading || isLoadingFilter || (isSuperAdmin && isLoadingCompanies);

  // 1. Filtrar notificações com base no filtro de empresa (se Super Admin)
  const filteredNotifications = useMemo(() => {
    if (!notifications) return [];
    
    // Se não for Super Admin, ou se o filtro estiver em 'all' (filteredCompanyId é undefined),
    // mostramos todas as notificações do usuário logado (que já são filtradas por RLS).
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

  const unreadCount = filteredNotifications.filter(n => !n.lida).length || 0;

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
            <Bell className="h-5 w-5" /> {t('notification_list_title')} ({filteredNotifications?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          
          {/* Filtro de Empresa (Apenas para Super Admin) */}
          {isSuperAdmin && (
            <div className="w-full md:w-64 mb-4">
              <Select 
                onValueChange={setSelectedCompanyId} 
                value={selectedCompanyId} 
                disabled={isLoadingCompanies || isChecking}
              >
                <SelectTrigger className="w-full">
                  <Building className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder={t('filter_all_companies')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filter_all_companies')}</SelectItem>
                  {companies?.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {isChecking && !isRefetching ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="text-center p-8 space-y-4 border border-destructive rounded-md bg-red-50/50 dark:bg-red-900/10">
              <p className="text-destructive">
                {t('error_loading_data')}
              </p>
            </div>
          ) : filteredNotifications && filteredNotifications.length > 0 ? (
            <NotificationTable notifications={filteredNotifications} />
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