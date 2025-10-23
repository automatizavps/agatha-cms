import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import CompanyForm from "./CompanyForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCompany, Company } from "@/integrations/supabase/companies";
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

  const handleSubmit = (values: { nome: string; cnpj: string | null }) => {
    mutation.mutate({
      id: company.id,
      nome: values.nome,
      cnpj: values.cnpj,
    });
  };

  // Valores iniciais para o formulário de edição
  const initialValues = {
    nome: company.nome,
    cnpj: company.cnpj,
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Editar Empresa: {company.nome}</SheetTitle>
        </SheetHeader>
        <div className="py-4">
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