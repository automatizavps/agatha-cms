import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import CompanyForm from "./CompanyForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCompany } from "@/integrations/supabase/companies";
import { Company } from "@/types/supabase"; // Importando o tipo centralizado
import { showSuccess, showError } from "@/utils/toast";

interface EditCompanySheetProps {
  company: Company;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditCompanySheet: React.FC<EditCompanySheetProps> = ({ company, isOpen, onOpenChange }) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: updateCompany,
    onSuccess: (data) => {
      showSuccess(`Empresa ${data.nome} atualizada com sucesso.`);
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      onOpenChange(false);
    },
    onError: (error) => {
      showError("Falha ao atualizar empresa: " + error.message);
    },
  });

  const handleSubmit = (values: { nome: string; cnpj: string | null; telefone: string | null; endereco_completo: string | null; email: string | null }) => {
    mutation.mutate({
      id: company.id,
      nome: values.nome,
      cnpj: values.cnpj,
      telefone: values.telefone,
      endereco_completo: values.endereco_completo,
      email: values.email,
    });
  };

  // Valores iniciais para o formulário de edição
  const initialValues = {
    nome: company.nome,
    cnpj: company.cnpj,
    telefone: company.telefone,
    endereco_completo: company.endereco_completo,
    email: company.email,
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Editar Empresa: {company.nome}</SheetTitle>
        </SheetHeader>
        <div className="py-4 flex-1 overflow-y-auto">
          <CompanyForm 
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

export default EditCompanySheet;