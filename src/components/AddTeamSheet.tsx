import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import TeamForm from "./TeamForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTeam, updateTeamMembers } from "@/integrations/supabase/teams";
import { showSuccess, showError } from "@/utils/toast";
import { useTranslation } from "react-i18next";

const AddTeamSheet = () => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const createTeamMutation = useMutation({
    mutationFn: createTeam,
    onSuccess: async (newTeam, variables) => {
      // 2. Atualizar membros após a criação da equipe
      if (variables.member_ids && variables.member_ids.length > 0) {
        try {
          await updateTeamMembers({ teamId: newTeam.id, memberIds: variables.member_ids });
        } catch (e: any) {
          showError(t("team_members_update_error") + e.message);
          // Continua, mas o usuário precisa ser notificado
        }
      }
      
      showSuccess(t('team_created_success', { name: newTeam.nome }));
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
      setIsOpen(false);
    },
    onError: (error) => {
      showError(t("error_loading_data") + ": " + error.message);
    },
  });

  const handleSubmit = (values: { 
    nome: string; 
    meta_mensal_valor: number; 
    meta_mensal_quantidade: number; 
    member_ids: string[];
    empresa_id?: string;
  }) => {
    // 1. Cria a equipe
    createTeamMutation.mutate(values);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> {t('add_new_team')}
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('add_new_team')}</SheetTitle>
        </SheetHeader>
        <div className="py-4 flex-1 overflow-y-auto">
          <TeamForm 
            onSubmit={handleSubmit} 
            isSubmitting={createTeamMutation.isPending} 
            isEditing={false}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AddTeamSheet;