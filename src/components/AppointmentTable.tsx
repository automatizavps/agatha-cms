import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Appointment, deleteAppointment, useAppointmentItems } from "@/integrations/supabase/appointments";
import { Loader2, CalendarCheck, MoreHorizontal, Pencil, Trash2, Clock, Building, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { showError } from "@/utils/toast";
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
import EditAppointmentSheet from "./EditAppointmentSheet";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";

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
      // Não precisamos de showSuccess aqui, pois a página pai (Appointments.tsx) lida com a exclusão em massa.
      // Mas mantemos a invalidação para exclusão individual.
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

  // Oculta o menu inteiro se não puder escrever
  if (!canWrite) {
    return null;
  }

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

interface AppointmentTableProps {
  appointments: Appointment[];
  selectedIds: Set<string>;
  onSelectChange: (newSelectedIds: Set<string>) => void;
  canWrite: boolean;
  isToday: (date: Date | number) => boolean; // NOVO: Função para verificar se é hoje
}

const AppointmentTable: React.FC<AppointmentTableProps> = ({ appointments, selectedIds, onSelectChange, canWrite, isToday }) => {
  const { data: profile } = useCurrentUserProfile();
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('data_hora');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const { t } = useTranslation();
  
  const isSuperAdmin = profile?.is_super_admin;

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
      setSortDirection('desc');
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
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(appointments.map(a => a.id));
      onSelectChange(allIds);
    } else {
      onSelectChange(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelectedIds = new Set(selectedIds);
    if (checked) {
      newSelectedIds.add(id);
    } else {
      newSelectedIds.delete(id);
    }
    onSelectChange(newSelectedIds);
  };
  
  const isAllSelected = appointments.length > 0 && selectedIds.size === appointments.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < appointments.length;

  return (
    <>
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
                  disabled={!canWrite}
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
            {sortedAppointments.map((appointment) => {
              const isAppointmentToday = isToday(new Date(appointment.data_hora));
              
              return (
                <TableRow 
                  key={appointment.id}
                  className={cn(
                    selectedIds.has(appointment.id) && "bg-accent/50 dark:bg-accent/20 hover:bg-accent/70 dark:hover:bg-accent/30",
                    // Destaque para agendamentos de hoje
                    isAppointmentToday && "bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/20"
                  )}
                >
                  {/* Checkbox Cell */}
                  <TableCell className="text-center">
                    <Checkbox
                      checked={selectedIds.has(appointment.id)}
                      onCheckedChange={(checked) => handleSelectRow(appointment.id, !!checked)}
                      disabled={!canWrite}
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
                    <AppointmentActions appointment={appointment} onEdit={handleEdit} canWrite={canWrite} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      
      {editingAppointment && (
        <EditAppointmentSheet 
          appointment={editingAppointment} 
          isOpen={isEditSheetOpen} 
          onOpenChange={handleCloseEditSheet} 
        />
      )}
    </>
  );
};

export default AppointmentTable;