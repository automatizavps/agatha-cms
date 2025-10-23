import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import TeamForm from "./TeamForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTeam, Team, useTeamMembers, updateTeamMembers } from "@/integrations/supabase/teams";
import { showSuccess, showError } from "@/utils/toast";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface EditTeamSheetProps {
  team: Team;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditTeamSheet: React.FC<EditTeamSheetProps> = ({ team, isOpen, onOpenChange }) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  // Carrega os membros atuais da equipe
  const { data: members, isLoading: isLoadingMembers } = useTeamMembers(team.id);

  const updateTeamMutation = useMutation({
    mutationFn: updateTeam,
    onSuccess: (data) => {
      showSuccess(t('team_updated_success', { name: data.nome }));
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      onOpenChange(false);
    },
    onError: (error) => {
      showError(t("error_loading_data") + ": " + error.message);
    },
  });
  
  const updateMembersMutation = useMutation({
    mutationFn: updateTeamMembers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamMembers", team.id] });
      queryClient.invalidateQueries({ queryKey: ["teams"] }); // Invalida a lista principal
    },
    onError: (error) => {
      showError(t("team_members_update_error") + error.message);
    },
  });
  
  const isSubmitting = updateTeamMutation.isPending || updateMembersMutation.isPending;

  const handleSubmit = async (values: { 
    nome: string; 
    meta_mensal_valor: number; 
    meta_mensal_quantidade: number; 
    member_ids: string[];
  }) => {
    try {
      // 1. Atualiza os dados principais da equipe
      await updateTeamMutation.mutateAsync({
        id: team.id,
        nome: values.nome,
        meta_mensal_valor: values.meta_mensal_valor,
        meta_mensal_quantidade: values.meta_mensal_quantidade,
      });
      
      // 2. Atualiza os membros da equipe
      await updateMembersMutation.mutateAsync({
        teamId: team.id,
        memberIds: values.member_ids,
      });
      
    } catch (e) {
      // O erro já é tratado nas mutações individuais
    }
  };

  // Valores iniciais para o formulário de edição
  const initialValues = {
    nome: team.nome,
    meta_mensal_valor: team.meta_mensal_valor,
    meta_mensal_quantidade: team.meta_mensal_quantidade,
    empresa_id: team.empresa_id,
    // Popula os IDs dos membros carregados
    member_ids: members?.map(m => m.usuario_id) || [],
  };
  
  if (isLoadingMembers) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-lg flex flex-col">
          <SheetHeader>
            <SheetTitle>{t('loading_team_data')}</SheetTitle>
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
          <SheetTitle>{t('edit_team')}: {team.nome}</SheetTitle>
        </SheetHeader>
        <div className="py-4 flex-1 overflow-y-auto">
          <TeamForm 
            onSubmit={handleSubmit} 
            isSubmitting={isSubmitting} 
            defaultValues={initialValues}
            isEditing={true}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EditTeamSheet;