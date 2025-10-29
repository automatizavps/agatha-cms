import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import CommissionRuleForm from "./CommissionRuleForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCommissionRule, CommissionRule, CommissionType, EntityType } from "@/integrations/supabase/commissions";
import { showSuccess, showError } from "@/utils/toast";
import { useTranslation } from "react-i18next";

interface EditCommissionRuleSheetProps {
  rule: CommissionRule;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditCommissionRuleSheet: React.FC<EditCommissionRuleSheetProps> = ({ rule, isOpen, onOpenChange }) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: updateCommissionRule,
    onSuccess: () => {
      showSuccess(t('commission_rule_updated_success', { defaultValue: 'Regra de comissionamento atualizada com sucesso!' }));
      queryClient.invalidateQueries({ queryKey: ["commissionRules"] });
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
  };

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