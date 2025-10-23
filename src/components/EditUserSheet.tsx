import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import UserForm from "./UserForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUser, UserProfile } from "@/integrations/supabase/users";
import { showSuccess, showError } from "@/utils/toast";

interface EditUserSheetProps {
  user: UserProfile;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditUserSheet: React.FC<EditUserSheetProps> = ({ user, isOpen, onOpenChange }) => {
  const queryClient = useQueryClient();

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

  const handleSubmit = (values: { full_name: string; email: string; perfil_id: string }) => {
    // O email não é editável neste formulário, mas é passado no UserFormValues.
    // A Edge Function de update só usa full_name e perfil_id.
    mutation.mutate({
      userIdToUpdate: user.id,
      full_name: values.full_name,
      perfil_id: parseInt(values.perfil_id),
    });
  };

  // Valores iniciais para o formulário de edição
  const initialValues = {
    full_name: user.nome_completo,
    email: "Email não editável", // Email não pode ser alterado via este endpoint
    perfil_id: String(user.perfil_id),
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Editar Usuário: {user.nome_completo}</SheetTitle>
        </SheetHeader>
        <div className="py-4">
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