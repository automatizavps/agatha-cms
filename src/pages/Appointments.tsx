import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppointments, Appointment, deleteAppointment, useAppointmentItems } from "@/integrations/supabase/appointments";
import { Loader2, CalendarCheck, MoreHorizontal, Pencil, Trash2, Clock, Building, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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
import { PermissionGuard } from "@/hooks/use-permission"; // CORREÇÃO: Importando PermissionGuard

interface AppointmentActionsProps {
  appointment: Appointment;
  onEdit: (appointment: Appointment) => void;
}

type SortKey = 'cliente' | 'empresa' | 'data_hora' | 'responsavel' | 'status';
type SortDirection = 'asc' | 'desc';

const AppointmentActions: React.FC<AppointmentActionsProps> = ({ appointment, onEdit }) => {
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
  const baseClasses = "capitalize px-2 py-1 rounded-full text-xs font-semibold";
  switch (status) {
    case 'confirmado':
      return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`;
    case 'cancelado':
      return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`;
    case 'concluido':
      return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`;
    case 'pendente':
    default:
      return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`;
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


const AppointmentsContent = () => {
  const { data: appointments, isLoading, isError, error, refetch, isRefetching } = useAppointments();
  const { data: profile } = useCurrentUserProfile();
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('data_hora');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const { t } = useTranslation();
  
  const isSuperAdmin = profile?.perfil_id === 1;

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
  
  const sortedAppointments = useMemo(() => {
    if (!appointments) return [];
    
    const sorted = [...appointments].sort((a, b) => {
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
  }, [appointments, sortKey, sortDirection]);


  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t('page_title_appointments')}</h1>
        <AddAppointmentSheet />
      </div>
      
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5" /> {t('nav_appointments')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && !isRefetching ? (
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
                    <TableRow key={appointment.id}>
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
                      <TableCell className="text-center align-middle"> {/* Adicionado align-middle */}
                        <span className={getStatusBadge(appointment.status)}>
                          {appointment.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <AppointmentActions appointment={appointment} onEdit={handleEdit} />
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

const Appointments = () => (
  // Perfis 1 (Super Admin), 2 (Admin) e 3 (Funcionário) têm permissão para gerenciar agendamentos
  <PermissionGuard allowedProfileIds={[1, 2, 3]}>
    <AppointmentsContent />
  </PermissionGuard>
);

export default Appointments;