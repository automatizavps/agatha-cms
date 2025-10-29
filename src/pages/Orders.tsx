import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, ShoppingCart, Search, Trash2, CalendarIcon, Building } from "lucide-react";
import { useOrders, deleteOrders } from "@/integrations/supabase/orders";
import { showError, showSuccess } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import OrderTable from "@/components/OrderTable";
import AddOrderSheet from "@/components/AddOrderSheet";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, isToday } from "date-fns"; // IMPORTADO isToday
import { ptBR } from "date-fns/locale";
import { useDashboardFilter } from "@/hooks/useDashboardFilter";
import { useCompanies } from "@/integrations/supabase/companies";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCanWrite } from "@/hooks/use-module-permission"; // REINTRODUZIDO

const Orders = () => {
  // --- Filter States ---
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  
  // Dashboard Filter Hook
  const { isSuperAdmin, selectedCompanyId, setSelectedCompanyId, filteredCompanyId, isLoadingFilter } = useDashboardFilter();
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
  
  // Permissões reintroduzidas
  const canWriteOrders = useCanWrite('orders');
  
  // Fetch data using filters
  const { data: orders, isLoading, isError, error, refetch, isRefetching } = useOrders(
    filteredCompanyId, // Passa o ID filtrado (undefined se for 'all' para SA, ou o ID fixo para Admin/Func)
    {
      startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
      endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
    }
  );

  const isChecking = isLoading || isLoadingFilter || (isSuperAdmin && isLoadingCompanies);

  if (isError && error) {
    showError(t("error_loading_data") + ": " + error.message);
  }
  
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (!searchTerm) return orders;

    const lowerCaseSearch = searchTerm.toLowerCase();
    return orders.filter(order => 
      order.clientes?.nome.toLowerCase().includes(lowerCaseSearch) ||
      order.status.toLowerCase().includes(lowerCaseSearch) ||
      // Adicionando busca pelo prefixo do ID (os 8 primeiros caracteres)
      order.id.slice(0, 8).toLowerCase().includes(lowerCaseSearch)
    );
  }, [orders, searchTerm]);
  
  // Mutação para exclusão em massa
  const bulkDeleteMutation = useMutation({
    mutationFn: deleteOrders,
    onSuccess: () => {
      showSuccess(t('orders_deleted_success', { count: selectedOrderIds.size }));
      setSelectedOrderIds(new Set()); // Limpa a seleção
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (error) => {
      showError(t('error_loading_data') + ": " + error.message);
    },
  });
  
  const handleBulkDelete = () => {
    if (selectedOrderIds.size === 0) return;
    
    const count = selectedOrderIds.size;
    const confirmMessage = count === 1 
      ? t('confirm_delete_single') 
      : t('confirm_delete_bulk', { count });
      
    if (window.confirm(confirmMessage)) {
      bulkDeleteMutation.mutate(Array.from(selectedOrderIds));
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl lg:text-2xl font-bold tracking-tight">{t('page_title_orders')}</h1>
        {canWriteOrders && <AddOrderSheet />}
      </div>
      
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShoppingCart className="h-5 w-5" /> {t('order_list_title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-start md:items-center mb-4 gap-3 flex-wrap">
            
            {/* Filtro de Empresa (Apenas para Super Admin) */}
            {isSuperAdmin && (
              <div className="w-full md:w-48">
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
            
            {/* Filtro de Data (Período) */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full md:w-[280px] justify-start text-left font-normal",
                    (!startDate || !endDate) && "text-muted-foreground"
                  )}
                  disabled={isLoading}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate && endDate ? (
                    `${format(startDate, 'dd/MM/yyyy', { locale: ptBR })} - ${format(endDate, 'dd/MM/yyyy', { locale: ptBR })}`
                  ) : (
                    <span>{t('select_date_range')}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: startDate, to: endDate }}
                  onSelect={(range) => {
                    setStartDate(range?.from);
                    setEndDate(range?.to);
                  }}
                  numberOfMonths={2}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            
            {/* Campo de Busca Textual */}
            <div className="relative w-full max-w-sm md:max-w-none md:flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('order_search_placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                disabled={isChecking}
              />
            </div>
            
            {/* Botão de Recarregar */}
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => refetch()} 
              disabled={isRefetching}
              className="shrink-0"
            >
              {isRefetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {/* Barra de Ações em Massa (NOVA POSIÇÃO) */}
          {canWriteOrders && selectedOrderIds.size > 0 && (
            <div className={cn(
              "mb-4 p-3 border border-destructive/50 shadow-lg rounded-lg transition-all duration-300",
              "flex items-center justify-between bg-card"
            )}>
              <span className="text-sm font-medium text-foreground">
                {t('selected_items_count', { count: selectedOrderIds.size })}
              </span>
              
              <Button 
                variant="destructive" 
                onClick={handleBulkDelete}
                disabled={bulkDeleteMutation.isPending}
              >
                {bulkDeleteMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                {t('delete')} ({selectedOrderIds.size})
              </Button>
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
              <Button onClick={() => refetch()} disabled={isRefetching}>
                {isRefetching ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {t('try_again')}
              </Button>
            </div>
          ) : filteredOrders.length > 0 ? (
            <OrderTable 
              orders={filteredOrders} 
              selectedIds={selectedOrderIds}
              onSelectChange={setSelectedOrderIds}
              canWrite={canWriteOrders}
              isToday={isToday} // PASSANDO isToday
            />
          ) : (
            <div className="text-center p-4 text-muted-foreground">
              {searchTerm ? t('no_data_found') : t('no_orders_found')}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default Orders;