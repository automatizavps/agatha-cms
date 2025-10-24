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
import { MoreHorizontal, Trash2, Pencil, ArrowUpDown, ArrowUp, ArrowDown, Package } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"; // Importando Tooltip

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
  const baseClasses = "capitalize px-3 py-1 rounded-full text-xs font-semibold";
  switch (status) {
    case 'entregue':
      // Verde Escuro (Fundo) e Verde Claro (Texto)
      return (
        <span className={cn(baseClasses, "bg-green-700/80 text-green-200 dark:bg-green-900/80 dark:text-green-300")}>
          {t('entregue')}
        </span>
      );
    case 'cancelado':
      // Vermelho Escuro (Fundo) e Vermelho Claro (Texto)
      return (
        <span className={cn(baseClasses, "bg-red-700/80 text-red-200 dark:bg-red-900/80 dark:text-red-300")}>
          {t('cancelado')}
        </span>
      );
    case 'pendente_entrega':
    default:
      // Marrom/Ouro Escuro (Fundo) e Amarelo/Ouro Claro (Texto)
      return (
        <span className={cn(baseClasses, "bg-yellow-700/80 text-yellow-200 dark:bg-yellow-900/80 dark:text-yellow-300")}>
          {t('pendente_entrega')}
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

// NOVO Componente para exibir a contagem de itens
const OrderItemCountDisplay: React.FC<{ order: Order }> = ({ order }) => {
  const { t } = useTranslation();
  
  const totalItems = useMemo(() => {
    return order.pedido_itens.reduce((sum, item) => sum + item.quantidade, 0);
  }, [order.pedido_itens]);
  
  if (totalItems === 0) {
    return <span className="text-muted-foreground">N/A</span>;
  }
  
  const tooltipContent = (
    <div className="space-y-1 text-sm">
      <p className="font-semibold mb-1">{t('order_list_title')}:</p>
      {order.pedido_itens.map((item, index) => (
        <div key={index} className="flex justify-between gap-4">
          <span className="truncate max-w-[150px]">{item.produtos?.nome || t('unknown_item')}</span>
          <span className="text-muted-foreground">x{item.quantidade}</span>
        </div>
      ))}
    </div>
  );

  return (
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1 cursor-default">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{totalItems}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
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
              <TableHead className="hidden sm:table-cell text-center">
                {t('quantity')}
              </TableHead>
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
                {/* NOVO: Quantidade de Itens */}
                <TableCell className="hidden sm:table-cell text-center">
                  <OrderItemCountDisplay order={order} />
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