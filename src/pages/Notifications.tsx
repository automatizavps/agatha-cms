import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, Bell, CheckCheck, Building, ChevronLeft, ChevronRight } from "lucide-react";
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
import { useMemo, useState } from "react";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";

const PAGE_SIZES = [20, 50, 100];

const Notifications = () => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  // Paginação e Tamanho da Página
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

  // Filtro de Empresa (Super Admin)
  const { isSuperAdmin, selectedCompanyId, setSelectedCompanyId, filteredCompanyId, isLoadingFilter } = useDashboardFilter();
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
  
  // Fetch de Notificações
  const { data: paginatedData, isLoading, isError, error, refetch, isRefetching } = useNotifications(currentPage, pageSize);
  
  const notifications = paginatedData?.notifications;
  const totalCount = paginatedData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const isChecking = isLoading || isLoadingFilter || (isSuperAdmin && isLoadingCompanies);

  // 1. Filtrar notificações com base no filtro de empresa (se Super Admin)
  const filteredNotifications = useMemo(() => {
    if (!notifications) return [];
    
    // Se não for Super Admin, ou se o filtro estiver em 'all' (filteredCompanyId é undefined),
    // mostramos todas as notificações do usuário logado (que já são filtradas por RLS e paginação).
    if (!isSuperAdmin || !filteredCompanyId) {
      return notifications;
    }
    
    // Se for Super Admin e houver um filtro ativo, filtramos:
    // a) Notificações que não têm empresa_id (globais/sistema)
    // b) Notificações que têm empresa_id correspondente ao filtro
    // NOTA: Esta filtragem é feita no cliente sobre a página atual, o que pode não ser ideal
    // se o filtro de empresa for muito restritivo. No entanto, como a RLS já filtra
    // por user_id, e o Super Admin vê todas as notificações dele, esta filtragem
    // é apenas para conveniência visual.
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
  
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };
  
  const handlePageSizeChange = (size: string) => {
    const newSize = parseInt(size);
    setPageSize(newSize);
    setCurrentPage(1); // Volta para a primeira página ao mudar o tamanho
  };

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
            <Bell className="h-5 w-5" /> {t('notification_list_title')} ({totalCount})
          </CardTitle>
        </CardHeader>
        <CardContent>
          
          <div className="flex flex-col md:flex-row items-start md:items-center mb-4 gap-3 flex-wrap">
            {/* Filtro de Empresa (Apenas para Super Admin) */}
            {isSuperAdmin && (
              <div className="w-full md:w-64">
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
            
            {/* Seletor de Tamanho da Página */}
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>{t('rows_per_page')}:</span>
              <Select onValueChange={handlePageSizeChange} value={String(pageSize)} disabled={isChecking}>
                <SelectTrigger className="w-[80px]">
                  <SelectValue placeholder={String(pageSize)} />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map(size => (
                    <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
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
            <>
              <NotificationTable notifications={filteredNotifications} />
              
              {/* Componente de Paginação - Ajustado para alinhar à direita e manter elementos juntos */}
              {totalPages > 1 && (
                <div className="mt-4 flex flex-col md:flex-row justify-end items-center gap-4">
                  
                  {/* Agrupando Informação da Página e Controles */}
                  <div className="flex items-center gap-4">
                    
                    {/* Informação da Página */}
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {t('page_info', { 
                        current: currentPage, 
                        total: totalPages, 
                        start: (currentPage - 1) * pageSize + 1,
                        end: Math.min(currentPage * pageSize, totalCount),
                        count: totalCount
                      })}
                    </span>
                    
                    {/* Controles de Paginação */}
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1 || isRefetching}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                        </PaginationItem>
                        
                        {/* Exibição simplificada de páginas */}
                        <PaginationItem className="flex items-center">
                          <Input 
                            type="number"
                            value={currentPage}
                            onChange={(e) => {
                              const page = parseInt(e.target.value);
                              if (!isNaN(page) && page >= 1 && page <= totalPages) {
                                setCurrentPage(page);
                              }
                            }}
                            onBlur={() => {
                              // Garante que o valor seja válido ao sair do foco
                              if (currentPage < 1) setCurrentPage(1);
                              if (currentPage > totalPages) setCurrentPage(totalPages);
                            }}
                            className="w-16 text-center h-9"
                            disabled={isRefetching}
                          />
                          <span className="text-sm text-muted-foreground mx-2">/ {totalPages}</span>
                        </PaginationItem>

                        <PaginationItem>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages || isRefetching}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                </div>
              )}
            </>
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