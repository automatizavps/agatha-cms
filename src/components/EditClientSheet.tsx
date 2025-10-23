import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import ClientForm from "./ClientForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateClient, Client } from "@/integrations/supabase/clients";
import { showSuccess, showError } from "@/utils/toast";

interface EditClientSheetProps {
  client: Client;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditClientSheet: React.FC<EditClientSheetProps> = ({ client, isOpen, onOpenChange }) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: updateClient,
    onSuccess: (data) => {
      showSuccess(`Cliente ${data.nome} atualizado com sucesso.`);
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      onOpenChange(false);
    },
    onError: (error) => {
      showError("Falha ao atualizar cliente: " + error.message);
    },
  });

  const handleSubmit = (values: { nome: string; email: string | null; telefone: string | null; endereco_completo: string | null; empresa_id?: string }) => {
    mutation.mutate({
      id: client.id,
      nome: values.nome,
      email: values.email,
      telefone: values.telefone,
      endereco_completo: values.endereco_completo, // Novo campo
    });
  };

  // Valores iniciais para o formulário de edição
  const initialValues = {
    nome: client.nome,
    email: client.email,
    telefone: client.telefone,
    endereco_completo: client.endereco_completo, // Novo campo
    empresa_id: client.empresa_id, 
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Editar Cliente: {client.nome}</SheetTitle>
        </SheetHeader>
        <div className="py-4 flex-1 overflow-y-auto">
          <ClientForm 
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

export default EditClientSheet;