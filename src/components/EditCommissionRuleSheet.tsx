import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import CommissionRuleForm from "./CommissionRuleForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCommissionRule, CommissionRule, CommissionType, EntityType, useRuleUsers } from "@/integrations/supabase/commissions";
import { showSuccess, showError } from "@/utils/toast";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

interface EditCommissionRuleSheetProps {
  rule: CommissionRule;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditCommissionRuleSheet: React.FC<EditCommissionRuleSheetProps> = ({ rule, isOpen, onOpenChange }) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  // Carrega os usuários associados à regra
  const { data: ruleUsers, isLoading: isLoadingRuleUsers } = useRuleUsers(rule.id);

  const mutation = useMutation({
    mutationFn: updateCommissionRule,
    onSuccess: () => {
      showSuccess(t('commission_rule_updated_success', { defaultValue: 'Regra de comissionamento atualizada com sucesso!' }));
      queryClient.invalidateQueries({ queryKey: ["commissionRules"] });
      queryClient.invalidateQueries({ queryKey: ["ruleUsers", rule.id] });
      onOpenChange(false);
    },
    onError: (error) => {
      showError(t("error_loading_data") + ": " + error.message);
    },
  });

  const handleSubmit = (values: { 
    tipo_entidade: EntityType; 
    entidade_id: string; 
    tipo_valor: CommissionType; 
    valor: number; 
    empresa_id?: string;
    usuario_ids: string[]; // NOVO
  }) => {
    mutation.mutate({
      id: rule.id,
      ...values,
    });
  };

  // Valores iniciais para o formulário de edição
  const initialValues = {
    empresa_id: rule.empresa_id,
    tipo_entidade: rule.tipo_entidade,
    entidade_id: rule.entidade_id,
    tipo_valor: rule.tipo_valor,
    valor: rule.valor,
    usuario_ids: ruleUsers?.map(u => u.usuario_id) || [], // NOVO
    entidade: rule.entidade, // Passa o nome da entidade para o fallback
  };
  
  if (isLoadingRuleUsers) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-xl flex flex-col">
          <SheetHeader>
            <SheetTitle>{t('loading_data')}</SheetTitle>
            <SheetDescription className="sr-only">
              {t('loading_data')}
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
      <SheetContent className="sm:max-w-xl flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('edit_commission_rule', { defaultValue: 'Editar Regra de Comissão' })}</SheetTitle>
          <SheetDescription className="sr-only">
            Formulário para editar a regra de comissionamento.
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 flex-1 overflow-y-auto">
          <CommissionRuleForm 
            onSubmit={handleSubmit} 
            isSubmitting={mutation.isPending} 
            defaultRule={initialValues}
            isEditing={true}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EditCommissionRuleSheet;