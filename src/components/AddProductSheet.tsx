import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import ProductForm from "./ProductForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProduct } from "@/integrations/supabase/products";
import { showSuccess, showError } from "@/utils/toast";

const AddProductSheet = () => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createProduct,
    onSuccess: (data) => {
      showSuccess(`Produto/Serviço ${data.nome} cadastrado com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setIsOpen(false);
    },
    onError: (error) => {
      showError("Falha ao cadastrar produto/serviço: " + error.message);
    },
  });

  const handleSubmit = (values: { nome: string; preco: number }) => {
    mutation.mutate(values);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Novo Produto/Serviço
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Cadastrar Novo Produto/Serviço</SheetTitle>
        </SheetHeader>
        <div className="py-4">
          <ProductForm 
            onSubmit={handleSubmit} 
            isSubmitting={mutation.isPending} 
            isEditing={false}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AddProductSheet;