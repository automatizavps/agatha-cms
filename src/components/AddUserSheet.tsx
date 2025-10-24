import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import UserForm from "./UserForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { inviteUser } from "@/integrations/supabase/users";
import { showSuccess, showError } from "@/utils/toast";
import { useTranslation } from "react-i18next";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile"; // Importando perfil

const AddUserSheet = () => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { data: currentProfile, isLoading: isLoadingProfile } = useCurrentUserProfile();
  
  const isSuperAdmin = currentProfile?.perfil_id === 1;
  
  if (isLoadingProfile || !isSuperAdmin) {
    // Apenas Super Admin pode convidar novos usuários
    return null;
  }

  const mutation = useMutation({
    mutationFn: inviteUser,
    onSuccess: () => {
      showSuccess("Convite enviado com sucesso! O usuário receberá um email.");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsOpen(false);
    },
    onError: (error) => {
      showError(t("error_loading_data") + ": " + error.message);
    },
  });

  const handleSubmit = (values: { 
    full_name: string; 
    email: string; 
    perfil_id: string; 
    telefone: string | null; 
    endereco_completo: string | null;
    empresa_id?: string | null;
  }) => {
    mutation.mutate({
      email: values.email,
      full_name: values.full_name,
      // perfil_id é passado como string (UUID ou '1')
      perfil_id: values.perfil_id, 
      telefone: values.telefone,
      endereco_completo: values.endereco_completo,
      empresa_id: values.empresa_id || undefined,
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> {t('add_new_user')}
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('add_new_user')}</SheetTitle>
          <SheetDescription className="sr-only">
            Formulário para convidar um novo usuário para a plataforma.
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 flex-1 overflow-y-auto">
          <UserForm 
            onSubmit={handleSubmit} 
            isSubmitting={mutation.isPending} 
            defaultValues={{ full_name: "", email: "", perfil_id: "", telefone: "", endereco_completo: "" }}
            isEditing={false}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AddUserSheet;