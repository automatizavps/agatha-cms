import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProduct, Product, ProductType } from "@/integrations/supabase/products";
import { showSuccess, showError } from "@/utils/toast";
import ProductOnlyForm from "./ProductOnlyForm";

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
      showSuccess(`Produto ${data.nome} atualizado com sucesso.`);
      queryClient.invalidateQueries({ queryKey: ["products_only"] }); // Invalida a query específica
      onOpenChange(false);
    },
    onError: (error) => {
      showError("Falha ao atualizar produto: " + error.message);
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
    mutation.mutate({
      id: product.id,
      nome: values.nome,
      preco: values.preco,
      tipo: 'produto', // Garante que o tipo não mude
      tempo_servico: null, // Garante que o tempo de serviço seja null
      estoque_total: values.estoque_total,
      fotos: values.fotos,
      marca: values.marca,
      categoria: values.categoria,
      empresa_id: values.empresa_id,
    });
  };

  // Valores iniciais para o formulário de edição
  const initialValues = {
    nome: product.nome,
    preco: String(product.preco), // CORREÇÃO: Convertendo number para string
    estoque_total: product.estoque_total !== null ? String(product.estoque_total) : null, // CORREÇÃO: Convertendo number para string
    fotos: product.fotos,
    marca: product.marca,
    categoria: product.categoria,
    empresa_id: product.empresa_id,
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl flex flex-col">
        <SheetHeader>
          <SheetTitle>Editar Produto: {product.nome}</SheetTitle>
          {/* Adicionando SheetDescription para acessibilidade */}
          <SheetDescription className="sr-only">
            Formulário para editar os detalhes do produto.
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 flex-1 overflow-y-auto">
          <ProductOnlyForm 
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