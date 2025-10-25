import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import UserForm from "./UserForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUserProfileByAdmin, UserProfile } from "@/integrations/supabase/users";
import { showSuccess, showError } from "@/utils/toast";
import { useTranslation } from "react-i18next";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";

interface EditUserSheetProps {
  user: UserProfile;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditUserSheet: React.FC<EditUserSheetProps> = ({ user, isOpen, onOpenChange }) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { data: currentProfile } = useCurrentUserProfile();
  
  const isSuperAdmin = currentProfile?.is_super_admin;

  const mutation = useMutation({
    mutationFn: updateUserProfileByAdmin,
    onSuccess: (data) => {
      showSuccess(t('user_updated_success', { name: data.nome_completo }));
      queryClient.invalidateQueries({ queryKey: ["users"] });
      // Se o usuário editado for o próprio Admin, invalida o perfil atual
      if (data.id === currentProfile?.id) {
        queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
      }
      onOpenChange(false);
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
    // Determina o perfil customizado ID ou null para Admin/SA
    let perfil_customizado_id: string | null = values.perfil_id;
    if (values.perfil_id === '1' || values.perfil_id === '2') {
      perfil_customizado_id = null;
    }
    
    // Apenas Super Admin pode mudar a empresa_id
    const empresa_id = isSuperAdmin ? values.empresa_id : undefined;

    mutation.mutate({
      id: user.id,
      nome_completo: values.nome_completo,
      telefone: values.telefone,
      endereco_completo: values.endereco_completo,
      perfil_customizado_id: perfil_customizado_id,
      empresa_id: empresa_id === user.empresa_id ? undefined : empresa_id, // Só envia se for diferente
    });
  };

  // Mapeia o perfil de volta para o ID de seleção do formulário
  const getProfileIdForForm = () => {
    if (user.perfil_customizado_id) {
      return user.perfil_customizado_id;
    }
    if (user.perfis?.nome === 'Super Admin') {
      return '1';
    }
    if (user.perfis?.nome === 'Admin') {
      return '2';
    }
    return '';
  };

  // Valores iniciais para o formulário de edição
  const initialValues = {
    id: user.id,
    email: user.email, // Não editável no form, mas necessário para defaultValues
    nome_completo: user.nome_completo,
    telefone: user.telefone,
    endereco_completo: user.endereco_completo,
    perfil_id: getProfileIdForForm(),
    empresa_id: user.empresa_id || "",
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('edit_user')}: {user.nome_completo}</SheetTitle>
          <SheetDescription className="sr-only">
            {t('edit_user_description', { defaultValue: 'Atualize os dados e o perfil de acesso do usuário.' })}
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 flex-1 overflow-y-auto">
          <UserForm 
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

export default EditUserSheet;