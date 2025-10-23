import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import CompanyForm from "./CompanyForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCompany } from "@/integrations/supabase/companies";
import { showSuccess, showError } from "@/utils/toast";

const AddCompanySheet = () => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createCompany,
    onSuccess: (data) => {
      showSuccess(`Empresa ${data.nome} cadastrada com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setIsOpen(false);
    },
    onError: (error) => {
      showError("Falha ao cadastrar empresa: " + error.message);
    },
  });

  const handleSubmit = (values: { nome: string; cnpj: string | null; dono_email?: string }) => {
    // O dono_email é ignorado na integração, pois usamos o ID do Super Admin logado como dono_id.
    // O trigger handle_new_empresa garante que o Super Admin logado seja promovido a Admin (2) e associado à nova empresa.
    mutation.mutate(values);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Nova Empresa
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Cadastrar Nova Empresa</SheetTitle>
        </SheetHeader>
        <div className="py-4">
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