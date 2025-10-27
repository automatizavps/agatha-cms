import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import OrderForm from "./OrderForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateOrder, Order, OrderStatus, useOrderItems } from "@/integrations/supabase/orders"; // Alterado para updateOrder
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
    mutationFn: updateOrder, // Usando a função updateOrder mais completa
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
  const handleSubmit = (values: { cliente_id: string; valor_total: number; items: any[]; status?: OrderStatus; promocao_id?: string | null }) => {
    if (!values.status) {
      showError("Status é obrigatório.");
      return;
    }
    
    mutation.mutate({
      id: order.id,
      cliente_id: order.cliente_id, // Mantém o cliente original
      valor_total: order.valor_total, // Mantém o valor total original (não editável aqui)
      status: values.status,
      promocao_id: order.promocao_id, // Mantém a promoção original (não editável aqui)
      queryClient: queryClient, // Passando o queryClient
    });
  };

  // Valores iniciais para o formulário (incluindo os itens carregados)
  const initialValues = {
    cliente_id: order.cliente_id,
    status: order.status,
    promocao_id: order.promocao_id, // NOVO: promocao_id
    // Mapeamos os itens carregados para o formato esperado pelo OrderForm
    items: orderItems?.map(item => ({
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
    })) || [],
    empresa_id: order.empresa_id, // Garantindo que o ID da empresa esteja no defaultValues
  };
  
  if (isLoadingItems) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-xl flex flex-col">
          <SheetHeader>
            <SheetTitle>Carregando Pedido...</SheetTitle>
            <SheetDescription className="sr-only">
              Carregando dados do pedido para edição.
            </SheetDescription>
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
      <SheetContent className="sm:max-w-xl flex flex-col">
        <SheetHeader>
          <SheetTitle>Editar Status do Pedido #{order.id.slice(0, 8)}</SheetTitle>
          <SheetDescription className="sr-only">
            Formulário para editar o status do pedido.
          </SheetDescription>
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