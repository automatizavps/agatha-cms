import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import ClientForm from "./ClientForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/integrations/supabase/clients";
import { showSuccess, showError } from "@/utils/toast";
import { useTranslation } from "react-i18next";
import { useCanWrite } from "@/hooks/use-module-permission"; // REINTRODUZIDO

const AddClientSheet = () => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  // Permissão de escrita para o módulo 'clients'
  const canWriteClients = useCanWrite('clients');
  
  if (!canWriteClients) {
    return null;
  }

  const mutation = useMutation({
    mutationFn: createClient,
    onSuccess: (data) => {
      showSuccess(`Cliente ${data.nome} cadastrado com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setIsOpen(false);
    },
    onError: (error) => {
      showError(t("error_loading_data") + ": " + error.message);
    },
  });

  const handleSubmit = (values: { nome: string; email: string | null; telefone: string | null; endereco_completo: string | null; avatar_url: string | null; empresa_id?: string }) => {
    mutation.mutate({
      nome: values.nome,
      email: values.email,
      telefone: values.telefone,
      endereco_completo: values.endereco_completo, // Novo campo
      avatar_url: values.avatar_url, // NOVO CAMPO
      // Passa empresa_id se estiver presente (Super Admin)
      empresa_id: values.empresa_id, 
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> {t('add_new_client')}
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-xl flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('add_new_client')}</SheetTitle>
          <SheetDescription>
            {t('client_form_description', { defaultValue: 'Preencha os detalhes para cadastrar um novo cliente.' })}
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 flex-1 overflow-y-auto">
          <ClientForm 
            onSubmit={handleSubmit} 
            isSubmitting={mutation.isPending} 
            isEditing={false}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AddClientSheet;