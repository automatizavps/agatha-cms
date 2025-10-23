import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import ProductForm from "./ProductForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProduct, Product } from "@/integrations/supabase/products";
import { showSuccess, showError } from "@/utils/toast";

interface EditProductSheetProps {
  product: Product;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditProductSheet: React.FC<EditProductSheetProps> = ({ product, isOpen, onOpenChange }) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: updateProduct,
    onSuccess: (data) => {
      showSuccess(`Produto/Serviço ${data.nome} atualizado com sucesso.`);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onOpenChange(false);
    },
    onError: (error) => {
      showError("Falha ao atualizar produto/serviço: " + error.message);
    },
  });

  const handleSubmit = (values: { nome: string; preco: number }) => {
    mutation.mutate({
      id: product.id,
      nome: values.nome,
      preco: values.preco,
    });
  };

  // Valores iniciais para o formulário de edição
  const initialValues = {
    nome: product.nome,
    preco: product.preco,
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Editar Produto/Serviço: {product.nome}</SheetTitle>
        </SheetHeader>
        <div className="py-4">
          <ProductForm 
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

export default EditProductSheet;