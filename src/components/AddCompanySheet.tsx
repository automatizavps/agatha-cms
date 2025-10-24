import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import CompanyForm from "./CompanyForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCompany } from "@/integrations/supabase/companies";
import { showSuccess, showError } from "@/utils/toast";
import { useTranslation } from "react-i18next";

const AddCompanySheet = () => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: createCompany,
    onSuccess: (data) => {
      showSuccess(`Empresa ${data.nome} cadastrada com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setIsOpen(false);
    },
    onError: (error) => {
      showError(t("error_loading_data") + ": " + error.message);
    },
  });

  const handleSubmit = (values: { nome: string; cnpj: string | null; telefone: string | null; endereco_completo: string | null; email: string | null }) => {
    mutation.mutate(values);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> {t('add_new_company')}
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('add_new_company')}</SheetTitle>
        </SheetHeader>
        <div className="py-4 flex-1 overflow-y-auto">
          <CompanyForm 
            onSubmit={handleSubmit} 
            isSubmitting={mutation.isPending} 
            isEditing={false}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AddCompanySheet;