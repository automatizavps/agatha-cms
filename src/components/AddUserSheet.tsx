import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import UserForm from "./UserForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { inviteUser } from "@/integrations/supabase/users";
import { showSuccess, showError } from "@/utils/toast";
import { useTranslation } from "react-i18next";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";

const AddUserSheet = () => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { data: profile } = useCurrentUserProfile();
  
  const isSuperAdmin = profile?.is_super_admin;

  const mutation = useMutation({
    mutationFn: inviteUser,
    onSuccess: (data) => {
      showSuccess(t('user_invited_success', { email: data.user.email }));
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsOpen(false);
    },
    onError: (error) => {
      showError(t("error_loading_data") + ": " + error.message);
    },
  });

  const handleSubmit = (values: { 
    email: string; 
    nome_completo: string; 
    telefone: string | null; 
    endereco_completo: string | null; 
    perfil_id: string; 
    empresa_id: string; 
  }) => {
    mutation.mutate({
      email: values.email,
      full_name: values.nome_completo,
      telefone: values.telefone,
      endereco_completo: values.endereco_completo,
      perfil_id: values.perfil_id,
      empresa_id: values.empresa_id,
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> {t('invite_user')}
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-xl flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('invite_user')}</SheetTitle>
          <SheetDescription>
            {t('invite_user_description', { defaultValue: 'Envie um convite por email para um novo usuário se cadastrar.' })}
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 flex-1 overflow-y-auto">
          <UserForm 
            onSubmit={handleSubmit} 
            isSubmitting={mutation.isPending} 
            isEditing={false}
            // Se não for SA, preenche a empresa_id automaticamente
            defaultValues={!isSuperAdmin && profile?.empresa_id ? { empresa_id: profile.empresa_id } : {}}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AddUserSheet;