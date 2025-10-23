import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import OrderForm from "./OrderForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateOrderStatus, Order, OrderStatus, useOrderItems } from "@/integrations/supabase/orders";
import { showSuccess, showError } from "@/utils/toast";
import { Loader2 } from "lucide-react";

interface EditOrderStatusSheetProps {
  order: Order;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditOrderStatusSheet: React.FC<EditOrderStatusSheetProps> = ({ order, isOpen, onOpenChange }) => {
  const queryClient = useQueryClient();
  const { data: orderItems, isLoading: isLoadingItems } = useOrderItems(order.id);

  const mutation = useMutation({
    mutationFn: updateOrderStatus,
    onSuccess: (data) => {
      showSuccess(`Status do pedido #${order.id.slice(0, 8)} atualizado para ${data.status.replace('_', ' ')}.`);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      onOpenChange(false);
    },
    onError: (error) => {
      showError("Falha ao atualizar status: " + error.message);
    },
  });

  // A edição de pedidos só permite alterar o status neste componente
  const handleSubmit = (values: { cliente_id: string; valor_total: number; items: any[]; status?: OrderStatus }) => {
    if (!values.status) {
      showError("Status é obrigatório.");
      return;
    }
    
    mutation.mutate({
      id: order.id,
      status: values.status,
    });
  };

  // Valores iniciais para o formulário (incluindo os itens carregados)
  const initialValues = {
    cliente_id: order.cliente_id,
    status: order.status,
    // Mapeamos os itens carregados para o formato esperado pelo OrderForm
    items: orderItems?.map(item => ({
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
    })) || [],
  };
  
  if (isLoadingItems) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-lg flex flex-col">
          <SheetHeader>
            <SheetTitle>Carregando Pedido...</SheetTitle>
          </SheetHeader>
          <div className="py-4 flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>Editar Status do Pedido #{order.id.slice(0, 8)}</SheetTitle>
        </SheetHeader>
        <div className="py-4 flex-1 overflow-y-auto">
          <OrderForm 
            onSubmit={handleSubmit} 
            isSubmitting={mutation.isPending} 
            defaultValues={initialValues}
            isEditing={true}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EditOrderStatusSheet;