import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Order, deleteOrder, OrderStatus } from "@/integrations/supabase/orders";
import { MoreHorizontal, Trash2, Pencil, DollarSign, Package } from "lucide-react";
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

interface OrderTableProps {
  orders: Order[];
}

interface OrderActionsProps {
  order: Order;
  onEditStatus: (order: Order) => void;
}

const OrderActions: React.FC<OrderActionsProps> = ({ order, onEditStatus }) => {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: deleteOrder,
    onSuccess: () => {
      showSuccess(`Pedido #${order.id.slice(0, 8)} excluído com sucesso.`);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (error) => {
      showError("Falha ao excluir pedido: " + error.message);
    },
  });

  const handleDelete = () => {
    if (window.confirm(`Tem certeza que deseja excluir o pedido #${order.id.slice(0, 8)} do cliente ${order.clientes?.nome}?`)) {
      deleteMutation.mutate(order.id);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Abrir menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Ações</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onEditStatus(order)}>
          <Pencil className="mr-2 h-4 w-4" /> Editar Status
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleDelete} 
          disabled={deleteMutation.isPending}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" /> Excluir Pedido
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
      return <Badge className={baseClasses} variant="destructive">Cancelado</Badge>;
    case 'pendente_entrega':
    default:
      return <Badge className={baseClasses} variant="secondary">Pendente</Badge>;
  }
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};


const OrderTable: React.FC<OrderTableProps> = ({ orders }) => {
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

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

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido #</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="hidden md:table-cell">Data</TableHead>
              <TableHead className="text-right">Valor Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium text-xs text-muted-foreground">
                  {order.id.slice(0, 8)}
                </TableCell>
                <TableCell className="font-medium">
                  {order.clientes?.nome || 'Cliente Removido'}
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