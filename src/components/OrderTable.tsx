import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Order, deleteOrder, OrderStatus } from "@/integrations/supabase/orders";
import { MoreHorizontal, Trash2, Pencil, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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
import { showError, showSuccess } from "@/utils/toast";
import EditOrderStatusSheet from "./EditOrderStatusSheet";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox"; // Importando Checkbox

interface OrderTableProps {
  orders: Order[];
  selectedIds: Set<string>; // NOVO
  onSelectChange: (newSelectedIds: Set<string>) => void; // NOVO
}

interface OrderActionsProps {
  order: Order;
  onEditStatus: (order: Order) => void;
}

type SortKey = 'id' | 'cliente' | 'data' | 'valor_total' | 'status';
type SortDirection = 'asc' | 'desc';

const OrderActions: React.FC<OrderActionsProps> = ({ order, onEditStatus }) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const deleteMutation = useMutation({
    mutationFn: deleteOrder,
    onSuccess: () => {
      showSuccess(`Pedido #${order.id.slice(0, 8)} excluído com sucesso.`);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (error) => {
      showError(t("error_loading_data") + ": " + error.message);
    },
  });

  const handleDelete = () => {
    if (window.confirm(t('confirm_delete'))) {
      deleteMutation.mutate(order.id);
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
        <DropdownMenuItem onClick={() => onEditStatus(order)}>
          <Pencil className="mr-2 h-4 w-4" /> {t('edit')} {t('order_table_header_status')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleDelete} 
          disabled={deleteMutation.isPending}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" /> {t('delete')} {t('nav_orders')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const getStatusBadge = (status: OrderStatus) => {
  const baseClasses = "capitalize px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200";
  
  // Estilos customizados baseados na imagem fornecida (Dark Mode Aesthetic)
  switch (status) {
    case 'entregue':
      return (
        <span 
          className={cn(baseClasses, "text-[#90EE90] dark:text-[#90EE90]")} // Verde Claro
          style={{ 
            backgroundColor: '#1E4620', // Verde Escuro
            boxShadow: '0 0 5px rgba(144, 238, 144, 0.5)', // Sombra Verde
          }}
        >
          Entregue
        </span>
      );
    case 'cancelado':
      return (
        <span 
          className={cn(baseClasses, "text-[#FFB6C1] dark:text-[#FFB6C1]")} // Rosa Claro
          style={{ 
            backgroundColor: '#8B0000', // Vermelho Escuro
            boxShadow: '0 0 5px rgba(255, 182, 193, 0.5)', // Sombra Vermelha
          }}
        >
          Cancelado
        </span>
      );
    case 'pendente_entrega':
    default:
      return (
        <span 
          className={cn(baseClasses, "text-[#FFD700] dark:text-[#FFD700]")} // Ouro
          style={{ 
            backgroundColor: '#8B4513', // Marrom Sela (Saddle Brown)
            boxShadow: '0 0 5px rgba(255, 215, 0, 0.5)', // Sombra Amarela
          }}
        >
          {status.replace('_', ' ')}
        </span>
      );
  }
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
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

  // Verifica se a classe 'text-right' está presente para aplicar 'justify-end'
  const isTextRight = className?.includes('text-right');
  // Verifica se a classe 'text-center' está presente para aplicar 'justify-center'
  const isTextCenter = className?.includes('text-center');

  return (
    <TableHead className={cn("cursor-pointer hover:text-foreground transition-colors", className)} onClick={() => onSort(sortKey)}>
      <div className={cn("flex items-center gap-1", isTextRight && "justify-end", isTextCenter && "justify-center")}>
        {children}
        <Icon className="ml-1 h-3 w-3 opacity-50" />
      </div>
    </TableHead>
  );
};


const OrderTable: React.FC<OrderTableProps> = ({ orders, selectedIds, onSelectChange }) => {
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('data');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const { t } = useTranslation();

  const handleEditStatus = (order: Order) => {
    setEditingOrder(order);
    setIsEditSheetOpen(true);
  };

  const handleCloseEditSheet = (open: boolean) => {
    setIsEditSheetOpen(open);
    if (!open) {
      setEditingOrder(null);
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
  
  const sortedOrders = useMemo(() => {
    if (!orders) return [];
    
    const sorted = [...orders].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortKey) {
        case 'id':
          aValue = a.id;
          bValue = b.id;
          break;
        case 'cliente':
          aValue = a.clientes?.nome || '';
          bValue = b.clientes?.nome || '';
          break;
        case 'data':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'valor_total':
          aValue = a.valor_total;
          bValue = b.valor_total;
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
  }, [orders, sortKey, sortDirection]);
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(orders.map(o => o.id));
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
  
  const isAllSelected = orders.length > 0 && selectedIds.size === orders.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < orders.length;


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
                />
              </TableHead>
              <SortableHeader 
                sortKey="id" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
              >
                {t('order_table_header_id')}
              </SortableHeader>
              <SortableHeader 
                sortKey="cliente" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
              >
                {t('order_table_header_client')}
              </SortableHeader>
              <SortableHeader 
                sortKey="data" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
                className="hidden md:table-cell"
              >
                {t('order_table_header_date')}
              </SortableHeader>
              <SortableHeader 
                sortKey="valor_total" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
                className="text-right"
              >
                {t('order_table_header_total')}
              </SortableHeader>
              <SortableHeader 
                sortKey="status" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
                className="text-center" // Adicionando text-center ao cabeçalho
              >
                {t('order_table_header_status')}
              </SortableHeader>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedOrders.map((order) => (
              <TableRow 
                key={order.id}
                className={cn(
                  selectedIds.has(order.id) && "bg-accent/50 dark:bg-accent/20 hover:bg-accent/70 dark:hover:bg-accent/30"
                )}
              >
                {/* Checkbox Cell */}
                <TableCell className="text-center">
                  <Checkbox
                    checked={selectedIds.has(order.id)}
                    onCheckedChange={(checked) => handleSelectRow(order.id, !!checked)}
                  />
                </TableCell>
                <TableCell className="font-medium text-xs text-muted-foreground">
                  {order.id.slice(0, 8)}
                </TableCell>
                <TableCell className="font-medium">
                  {order.clientes?.nome || t('no_data_found')}
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(order.valor_total)}
                </TableCell>
                <TableCell className="text-center"> {/* Adicionando text-center ao conteúdo */}
                  {getStatusBadge(order.status)}
                </TableCell>
                <TableCell className="text-right">
                  <OrderActions order={order} onEditStatus={handleEditStatus} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {editingOrder && (
        <EditOrderStatusSheet 
          order={editingOrder} 
          isOpen={isEditSheetOpen} 
          onOpenChange={handleCloseEditSheet} 
        />
      )}
    </>
  );
};

export default OrderTable;