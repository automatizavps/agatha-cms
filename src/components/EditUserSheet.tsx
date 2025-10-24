import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import UserForm from "./UserForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUser, UserProfile } from "@/integrations/supabase/users";
import { showSuccess, showError } from "@/utils/toast";
import { useUserEmail } from "@/integrations/supabase/useUserEmail";
import { Loader2, Key } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile"; // Importando perfil atual
import ResetPasswordDialog from "./ResetPasswordDialog"; // Importando o novo componente

interface EditUserSheetProps {
  user: UserProfile;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditUserSheet: React.FC<EditUserSheetProps> = ({ user, isOpen, onOpenChange }) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  // Perfil do usuário logado
  const { data: currentProfile } = useCurrentUserProfile();
  const isSuperAdmin = currentProfile?.perfil_id === 1;
  // Removida a verificação isEditingSelf para permitir que o Super Admin redefina a própria senha
  
  // Busca o email real do usuário que está sendo editado
  const { data: userEmail, isLoading: isLoadingEmail } = useUserEmail(user.id);

  const mutation = useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      showSuccess(`Usuário ${user.nome_completo} atualizado com sucesso.`);
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onOpenChange(false);
    },
    onError: (error) => {
      showError("Falha ao atualizar usuário: " + error.message);
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
    // O email não é editável neste formulário, mas é passado no UserFormValues.
    mutation.mutate({
      userIdToUpdate: user.id,
      full_name: values.full_name,
      perfil_id: parseInt(values.perfil_id),
      telefone: values.telefone,
      endereco_completo: values.endereco_completo,
      empresa_id: values.empresa_id,
    });
  };

  // Valores iniciais para o formulário de edição
  const initialValues = {
    full_name: user.nome_completo,
    email: userEmail || 'Carregando...', // Usa o email carregado
    perfil_id: String(user.perfil_id),
    telefone: user.telefone,
    endereco_completo: user.endereco_completo,
    empresa_id: user.empresa_id,
  };
  
  if (isLoadingEmail) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-lg flex flex-col">
          <SheetHeader>
            <SheetTitle>{t('loading_user_data')}</SheetTitle>
            <SheetDescription className="sr-only">
              {t('loading_user_data_description')}
            </SheetDescription>
          </SheetHeader>
          <div className="py-4 flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('edit_user')}: {user.nome_completo}</SheetTitle>
          <SheetDescription className="sr-only">
            {t('edit_user_description')}
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 flex-1 overflow-y-auto">
          <UserForm 
            onSubmit={handleSubmit} 
            isSubmitting={mutation.isPending} 
            defaultValues={initialValues}
            isEditing={true}
          />
          
          {/* Opção de Redefinir Senha (Apenas Super Admin) */}
          {isSuperAdmin && (
            <div className="pt-6 border-t mt-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Key className="h-5 w-5 text-muted-foreground" />
                {t('reset_password_title')}
              </h3>
              <ResetPasswordDialog 
                userIdToUpdate={user.id} 
                userName={user.nome_completo} 
              />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EditUserSheet;