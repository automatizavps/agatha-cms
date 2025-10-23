import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import OrderForm from "./OrderForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createOrder } from "@/integrations/supabase/orders";
import { showSuccess, showError } from "@/utils/toast";

const AddOrderSheet = () => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      showSuccess("Pedido criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setIsOpen(false);
    },
    onError: (error) => {
      showError("Falha ao criar pedido: " + error.message);
    },
  });

  const handleSubmit = (values: { cliente_id: string; valor_total: number; items: { produto_id: string; quantidade: number; preco_unitario: number; }[] }) => {
    mutation.mutate(values);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button>
          <ShoppingCart className="mr-2 h-4 w-4" /> Novo Pedido
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>Criar Novo Pedido</SheetTitle>
        </SheetHeader>
        <div className="py-4 flex-1 overflow-y-auto">
          <OrderForm 
            onSubmit={handleSubmit} 
            isSubmitting={mutation.isPending} 
            isEditing={false}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AddOrderSheet;