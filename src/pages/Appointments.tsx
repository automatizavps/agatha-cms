import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppointments, Appointment, deleteAppointment, useAppointmentItems, deleteAppointments } from "@/integrations/supabase/appointments";
import { Loader2, CalendarCheck, MoreHorizontal, Pencil, Trash2, Clock, Building, ArrowUpDown, ArrowUp, ArrowDown, Search, RefreshCw, CalendarIcon, Filter } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import AddAppointmentSheet from "@/components/AddAppointmentSheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import EditAppointmentSheet from "@/components/EditAppointmentSheet";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { useDashboardFilter } from "@/hooks/useDashboardFilter";
import { useCompanies } from "@/integrations/supabase/companies";

interface AppointmentActionsProps {
  appointment: Appointment;
  onEdit: (appointment: Appointment) => void;
  canWrite: boolean;
}

type SortKey = 'cliente' | 'empresa' | 'data_hora' | 'responsavel' | 'status';
type SortDirection = 'asc' | 'desc';

const AppointmentActions: React.FC<AppointmentActionsProps> = ({ appointment, onEdit, canWrite }) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const deleteMutation = useMutation({
    mutationFn: deleteAppointment,
    onSuccess: () => {
      showSuccess(`Agendamento para ${appointment.clientes?.nome || 'Cliente'} excluído com sucesso.`);
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (error) => {
      showError(t("error_loading_data") + ": " + error.message);
    },
  });

  const handleDelete = () => {
    if (window.confirm(t('confirm_delete'))) {
      deleteMutation.mutate(appointment.id);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">{t('actions')}</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
        
        {/* canWrite é sempre true agora que RLS está desabilitado */}
        <DropdownMenuItem onClick={() => onEdit(appointment)}>
          <Pencil className="mr-2 h-4 w-4" /> {t('edit')}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleDelete} 
          disabled={deleteMutation.isPending}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" /> {t('delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Componente auxiliar para carregar e exibir o item principal
const AppointmentItemDisplay: React.FC<{ appointmentId: string }> = ({ appointmentId }) => {
  const { data: items, isLoading } = useAppointmentItems(appointmentId);
  const { t } = useTranslation();
  
  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }
  
  if (!items || items.length === 0) {
    return <span className="text-muted-foreground">N/A</span>;
  }
  
  const firstItem = items[0];
  const itemName = firstItem.produtos?.nome || t('no_data_found');
  
  const tooltipContent = (
    <div className="space-y-1 text-sm">
      <p className="font-semibold mb-1">{t('nav_appointments')} {t('nav_products')}:</p>
      {items.map((item, index) => (
        <div key={index} className="flex justify-between gap-4">
          <span className="truncate max-w-[150px]">{item.produtos?.nome || t('no_data_found')}</span>
          <span className="text-muted-foreground">x{item.quantidade}</span>
        </div>
      ))}
    </div>
  );

  return (
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        <div className="flex flex-col items-start cursor-default">
          <span className="font-medium">{itemName}</span>
          {items.length > 1 && (
            <Badge variant="secondary" className="mt-1 text-xs">
              + {items.length - 1} {items.length === 2 ? t('nav_products') : t('nav_products')}
            </Badge>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
};

const getStatusBadge = (status: Appointment['status']) => {
  const baseClasses = "capitalize px-3 py-1 rounded-full text-xs font-semibold";
  switch (status) {
    case 'confirmado':
    case 'concluido':
      // Verde Escuro (Fundo) e Verde Claro (Texto)
      return cn(baseClasses, "bg-green-700/80 text-green-200 dark:bg-green-900/80 dark:text-green-300");
    case 'cancelado':
      // Vermelho Escuro (Fundo) e Vermelho Claro (Texto)
      return cn(baseClasses, "bg-red-700/80 text-red-200 dark:bg-red-900/80 dark:text-red-300");
    case 'pendente':
    default:
      // Marrom/Ouro Escuro (Fundo) e Amarelo/Ouro Claro (Texto)
      return cn(baseClasses, "bg-yellow-700/80 text-yellow-200 dark:bg-yellow-900/80 dark:text-yellow-300");
  }
};

interface SortableHeaderProps {
  children: React.ReactNode;
  sortKey: SortKey;
  currentSortKey: SortKey;
  currentSortDirection: SortDirection;
  onSort: (key: SortKey) => void;
  className?: string;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({ children, sortKey, currentSortKey, currentSortDirection, onSort, className }) => {
  const isCurrent = currentSortKey === sortKey;
  
  const Icon = isCurrent 
    ? (currentSortDirection === 'asc' ? ArrowUp : ArrowDown) 
    : ArrowUpDown;

  return (
    <TableHead className={cn("cursor-pointer hover:text-foreground transition-colors", className)} onClick={() => onSort(sortKey)}>
      <div className={cn("flex items-center gap-1", className?.includes('text-right') && "justify-end", className?.includes('text-center') && "justify-center")}>
        {children}
        <Icon className="ml-1 h-3 w-3 opacity-50" />
      </div>
    </TableHead>
  );
};

const statusOptions: Appointment['status'][] = ['pendente', 'confirmado', 'cancelado', 'concluido'];

const Appointments = () => {
  const { data: profile } = useCurrentUserProfile();
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('data_hora');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  
  // --- Filter States ---
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<Appointment['status'] | 'all'>('all');
  
  // --- Selection State ---
  const [selectedAppointmentIds, setSelectedAppointmentIds] = useState<Set<string>>(new Set());
  
  // Dashboard Filter Hook
  const { isSuperAdmin, selectedCompanyId, setSelectedCompanyId, filteredCompanyId, isLoadingFilter } = useDashboardFilter();
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
  
  // Permissões baseadas no perfil customizado - REMOVIDAS
  const canWriteAppointments = true; // FORÇADO TRUE

  // Fetch data using filters
  const { data: appointments, isLoading, isError, error, refetch, isRefetching } = useAppointments(
    filteredCompanyId, // Passa o ID filtrado
    {
      startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
      endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
      status: statusFilter,
    }
  );

  const isChecking = isLoading || isLoadingFilter || (isSuperAdmin && isLoadingCompanies);

  if (isError && error) {
    showError(t("error_loading_data") + ": " + error.message);
  }
  
  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setIsEditSheetOpen(true);
  };

  const handleCloseEditSheet = (open: boolean) => {
    setIsEditSheetOpen(open);
    if (!open) {
      setEditingAppointment(null);
    }
  };
  
  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };
  
  // Client-side search filtering
  const filteredAppointments = useMemo(() => {
    if (!appointments) return [];
    
    let filtered = appointments;
    
    // 1. Search Term Filter (client-side)
    if (searchTerm) {
      const lowerCaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(appointment => 
        appointment.clientes?.nome.toLowerCase().includes(lowerCaseSearch) ||
        appointment.responsavel?.nome_completo.toLowerCase().includes(lowerCaseSearch) ||
        appointment.status.toLowerCase().includes(lowerCaseSearch)
      );
    }
    
    return filtered;
  }, [appointments, searchTerm]);
  
  // Sorting logic
  const sortedAppointments = useMemo(() => {
    if (!filteredAppointments) return [];
    
    const sorted = [...filteredAppointments].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortKey) {
        case 'cliente':
          aValue = a.clientes?.nome || '';
          bValue = b.clientes?.nome || '';
          break;
        case 'empresa':
          aValue = a.empresas?.nome || '';
          bValue = b.empresas?.nome || '';
          break;
        case 'data_hora':
          aValue = new Date(a.data_hora).getTime();
          bValue = new Date(b.data_hora).getTime();
          break;
        case 'responsavel':
          aValue = a.responsavel?.nome_completo || '';
          bValue = b.responsavel?.nome_completo || '';
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }
      
      if (typeof aValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }, [filteredAppointments, sortKey, sortDirection]);
  
  // Mutação para exclusão em massa
  const bulkDeleteMutation = useMutation({
    mutationFn: deleteAppointments,
    onSuccess: () => {
      showSuccess(t('appointments_deleted_success', { count: selectedAppointmentIds.size }));
      setSelectedAppointmentIds(new Set()); // Limpa a seleção
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (error) => {
      showError(t('error_loading_data') + ": " + error.message);
    },
  });
  
  const handleBulkDelete = () => {
    if (selectedAppointmentIds.size === 0) return;
    
    const count = selectedAppointmentIds.size;
    const confirmMessage = count === 1 
      ? t('confirm_delete_single') 
      : t('confirm_delete_bulk', { count });
      
    if (window.confirm(confirmMessage)) {
      bulkDeleteMutation.mutate(Array.from(selectedAppointmentIds));
    }
  };
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(filteredAppointments.map(a => a.id));
      setSelectedAppointmentIds(allIds);
    } else {
      setSelectedAppointmentIds(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelectedIds = new Set(selectedAppointmentIds);
    if (checked) {
      newSelectedIds.add(id);
    } else {
      newSelectedIds.delete(id);
    }
    setSelectedAppointmentIds(newSelectedIds);
  };
  
  const isAllSelected = filteredAppointments.length > 0 && selectedAppointmentIds.size === filteredAppointments.length;
  const isIndeterminate = selectedAppointmentIds.size > 0 && selectedAppointmentIds.size < filteredAppointments.length;


  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl lg:text-2xl font-bold tracking-tight">{t('page_title_appointments')}</h1>
        {canWriteAppointments && <AddAppointmentSheet />}
      </div>
      
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarCheck className="h-5 w-5" /> {t('nav_appointments')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          
          {/* --- Filter UI --- */}
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
            
            {/* Filtro de Data */}
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
            
            {/* Filtro de Status */}
            <Select onValueChange={(val) => setStatusFilter(val as Appointment['status'] | 'all')} value={statusFilter} disabled={isLoading}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder={t('filter_all_status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter_all_status')}</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status} className="capitalize">
                    {t(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Campo de Busca Textual */}
            <div className="relative w-full max-w-sm md:max-w-none md:flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('appointment_search_placeholder')}
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
          {canWriteAppointments && selectedAppointmentIds.size > 0 && (
            <div className={cn(
              "mb-4 p-3 border border-destructive/50 shadow-lg rounded-lg transition-all duration-300",
              "flex items-center justify-between bg-card"
            )}>
              <span className="text-sm font-medium text-foreground">
                {t('selected_items_count', { count: selectedAppointmentIds.size })}
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
                {t('delete')} ({selectedAppointmentIds.size})
              </Button>
            </div>
          )}
          
          {isChecking && !isRefetching ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="text-center text-destructive p-4 border border-destructive rounded-md">
              {t('error_loading_data')}
            </div>
          ) : sortedAppointments && sortedAppointments.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {/* Checkbox Header */}
                    <TableHead className="w-[50px] text-center">
                      <Checkbox
                        checked={isAllSelected || isIndeterminate}
                        onCheckedChange={(checked) => handleSelectAll(!!checked)}
                        aria-label={t('select_all')}
                        disabled={!canWriteAppointments}
                      />
                    </TableHead>
                    <SortableHeader 
                      sortKey="cliente" 
                      currentSortKey={sortKey} 
                      currentSortDirection={sortDirection} 
                      onSort={handleSort}
                    >
                      {t('order_table_header_client')}
                    </SortableHeader>
                    {isSuperAdmin && (
                      <SortableHeader 
                        sortKey="empresa" 
                        currentSortKey={sortKey} 
                        currentSortDirection={sortDirection} 
                        onSort={handleSort}
                        className="hidden md:table-cell"
                      >
                        {t('user_table_header_company')}
                      </SortableHeader>
                    )}
                    <TableHead>{t('nav_products')}</TableHead>
                    <SortableHeader 
                      sortKey="data_hora" 
                      currentSortKey={sortKey} 
                      currentSortDirection={sortDirection} 
                      onSort={handleSort}
                    >
                      {t('order_table_header_date')}
                    </SortableHeader>
                    <SortableHeader 
                      sortKey="responsavel" 
                      currentSortKey={sortKey} 
                      currentSortDirection={sortDirection} 
                      onSort={handleSort}
                    >
                      {t('responsible')}
                    </SortableHeader>
                    <SortableHeader 
                      sortKey="status" 
                      currentSortKey={sortKey} 
                      currentSortDirection={sortDirection} 
                      onSort={handleSort}
                      className="text-center"
                    >
                      {t('order_table_header_status')}
                    </SortableHeader>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAppointments.map((appointment) => (
                    <TableRow 
                      key={appointment.id}
                      className={cn(
                        selectedAppointmentIds.has(appointment.id) && "bg-accent/50 dark:bg-accent/20 hover:bg-accent/70 dark:hover:bg-accent/30"
                      )}
                    >
                      {/* Checkbox Cell */}
                      <TableCell className="text-center">
                        <Checkbox
                          checked={selectedAppointmentIds.has(appointment.id)}
                          onCheckedChange={(checked) => handleSelectRow(appointment.id, !!checked)}
                          disabled={!canWriteAppointments}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{appointment.clientes?.nome || t('no_data_found')}</TableCell>
                      {isSuperAdmin && (
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            {appointment.empresas?.nome || 'N/A'}
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <AppointmentItemDisplay appointmentId={appointment.id} />
                      </TableCell>
                      <TableCell>
                        {format(new Date(appointment.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{appointment.responsavel?.nome_completo || "N/A"}</TableCell>
                      <TableCell className="text-center">
                        <span className={getStatusBadge(appointment.status)}>
                          {t(appointment.status)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <AppointmentActions appointment={appointment} onEdit={handleEdit} canWrite={canWriteAppointments} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center p-4 text-muted-foreground">
              {t('no_data_found')}
            </div>
          )}
        </CardContent>
      </Card>
      
      {editingAppointment && (
        <EditAppointmentSheet 
          appointment={editingAppointment} 
          isOpen={isEditSheetOpen} 
          onOpenChange={handleCloseEditSheet} 
        />
      )}
    </DashboardLayout>
  );
};

export default Appointments;