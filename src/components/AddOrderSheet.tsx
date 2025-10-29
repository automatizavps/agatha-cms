import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import OrderForm from "./OrderForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createOrder } from "@/integrations/supabase/orders";
import { showSuccess, showError } from "@/utils/toast";
import { useTranslation } from "react-i18next";

const AddOrderSheet = () => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      showSuccess("Pedido criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setIsOpen(false);
    },
    onError: (error) => {
      showError(t("error_loading_data") + ": " + error.message);
    },
  });

  const handleSubmit = (values: { cliente_id: string; valor_total: number; items: { produto_id: string; quantidade: number; preco_unitario: number; }[]; empresa_id?: string }) => {
    mutation.mutate({ ...values, queryClient });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button>
          <ShoppingCart className="mr-2 h-4 w-4" /> {t('add_new_order')}
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-xl flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('add_new_order')}</SheetTitle>
          <SheetDescription className="sr-only">
            Formulário para criar um novo pedido.
          </SheetDescription>
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