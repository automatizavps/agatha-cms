import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import UserForm from "./UserForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUser, UserProfile } from "@/integrations/supabase/users";
import { showSuccess, showError } from "@/utils/toast";
import { useUserEmail } from "@/integrations/supabase/useUserEmail"; // Importando o novo hook
import { Loader2 } from "lucide-react";

interface EditUserSheetProps {
  user: UserProfile;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditUserSheet: React.FC<EditUserSheetProps> = ({ user, isOpen, onOpenChange }) => {
  const queryClient = useQueryClient();
  
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
            <SheetTitle>Carregando Dados do Usuário...</SheetTitle>
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
          <SheetTitle>Editar Usuário: {user.nome_completo}</SheetTitle>
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