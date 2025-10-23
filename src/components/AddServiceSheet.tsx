import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProduct, ProductType } from "@/integrations/supabase/products";
import { showSuccess, showError } from "@/utils/toast";
import ServiceOnlyForm from "./ServiceOnlyForm";

const AddServiceSheet = () => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createProduct,
    onSuccess: (data) => {
      showSuccess(`Serviço ${data.nome} cadastrado com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["services_only"] }); // Invalida a query específica
      setIsOpen(false);
    },
    onError: (error) => {
      showError("Falha ao cadastrar serviço: " + error.message);
    },
  });

  const handleSubmit = (values: { 
    nome: string; 
    preco: number; 
    tipo: ProductType; 
    tempo_servico: number | null; 
    estoque_total: number | null;
    fotos: string[] | null;
    marca: string | null;
    categoria: string | null;
    empresa_id?: string;
  }) => {
    // Garantimos que o tipo é 'servico'
    mutation.mutate({ ...values, tipo: 'servico' });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Novo Serviço
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Cadastrar Novo Serviço</SheetTitle>
        </SheetHeader>
        <div className="py-4 flex-1 overflow-y-auto">
          <ServiceOnlyForm 
            onSubmit={handleSubmit} 
            isSubmitting={mutation.isPending} 
            isEditing={false}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AddServiceSheet;