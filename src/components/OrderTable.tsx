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

interface OrderTableProps {
  orders: Order[];
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
  const baseClasses = "capitalize";
  switch (status) {
    case 'entregue':
      return <Badge className={baseClasses} variant="default">Entregue</Badge>;
    case 'cancelado':
    case 'pendente_entrega':
    default:
      // Usando secondary para pendente e destructive para cancelado
      return <Badge className={baseClasses} variant={status === 'cancelado' ? 'destructive' : 'secondary'}>{status.replace('_', ' ')}</Badge>;
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

  return (
    <TableHead className={cn("cursor-pointer hover:text-foreground transition-colors", className)} onClick={() => onSort(sortKey)}>
      <div className="flex items-center gap-1">
        {children}
        <Icon className="ml-1 h-3 w-3 opacity-50" />
      </div>
    </TableHead>
  );
};


const OrderTable: React.FC<OrderTableProps> = ({ orders }) => {
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


  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
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
                className="text-right" // Adicionado text-right aqui
              >
                {t('order_table_header_total')}
              </SortableHeader>
              <SortableHeader 
                sortKey="status" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
              >
                {t('order_table_header_status')}
              </SortableHeader>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedOrders.map((order) => (
              <TableRow key={order.id}>
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
                <TableCell>
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