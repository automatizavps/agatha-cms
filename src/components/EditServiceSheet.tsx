import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProduct, Product, ProductType } from "@/integrations/supabase/products";
import { showSuccess, showError } from "@/utils/toast";
import ServiceOnlyForm from "./ServiceOnlyForm";

interface EditServiceSheetProps {
  service: Product;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditServiceSheet: React.FC<EditServiceSheetProps> = ({ service, isOpen, onOpenChange }) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: updateProduct,
    onSuccess: (data) => {
      showSuccess(`Serviço ${data.nome} atualizado com sucesso.`);
      queryClient.invalidateQueries({ queryKey: ["services_only"] }); // Invalida a query específica
      onOpenChange(false);
    },
    onError: (error) => {
      showError("Falha ao atualizar serviço: " + error.message);
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
      id: service.id,
      nome: values.nome,
      preco: values.preco,
      tipo: 'servico', // Garante que o tipo não mude
      tempo_servico: values.tempo_servico,
      estoque_total: null, // Garante que o estoque seja null
      fotos: values.fotos,
      marca: null, // Garante que a marca seja null
      categoria: values.categoria,
      empresa_id: values.empresa_id,
    });
  };

  // Valores iniciais para o formulário de edição
  const initialValues = {
    nome: service.nome,
    preco: service.preco,
    tempo_servico: service.tempo_servico,
    fotos: service.fotos,
    categoria: service.categoria,
    empresa_id: service.empresa_id,
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>Editar Serviço: {service.nome}</SheetTitle>
        </SheetHeader>
        <div className="py-4 flex-1 overflow-y-auto">
          <ServiceOnlyForm 
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

export default EditServiceSheet;