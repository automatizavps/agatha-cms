import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import ProductForm from "./ProductForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProduct, Product, ProductType } from "@/integrations/supabase/products";
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
      showSuccess(`Item ${data.nome} atualizado com sucesso.`);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onOpenChange(false);
    },
    onError: (error) => {
      showError("Falha ao atualizar item: " + error.message);
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
  }) => {
    mutation.mutate({
      id: product.id,
      nome: values.nome,
      preco: values.preco,
      tipo: values.tipo,
      tempo_servico: values.tempo_servico,
      estoque_total: values.estoque_total,
      fotos: values.fotos,
      marca: values.marca,
      categoria: values.categoria,
    });
  };

  // Valores iniciais para o formulário de edição
  const initialValues = {
    nome: product.nome,
    preco: product.preco,
    tipo: product.tipo,
    estoque_total: product.estoque_total,
    tempo_servico: product.tempo_servico,
    fotos: product.fotos,
    marca: product.marca,
    categoria: product.categoria,
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Editar Item: {product.nome}</SheetTitle>
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