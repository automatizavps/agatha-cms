import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PlusCircle, DollarSign } from "lucide-react";
import CommissionRuleForm from "./CommissionRuleForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCommissionRule, CommissionType, EntityType } from "@/integrations/supabase/commissions";
import { showSuccess, showError } from "@/utils/toast";
import { useTranslation } from "react-i18next";

const AddCommissionRuleSheet = () => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: createCommissionRule,
    onSuccess: () => {
      showSuccess(t('commission_rule_created_success', { defaultValue: 'Regra de comissionamento criada com sucesso!' }));
      queryClient.invalidateQueries({ queryKey: ["commissionRules"] });
      setIsOpen(false);
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
    mutation.mutate(values);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> {t('add_new_commission_rule', { defaultValue: 'Nova Regra' })}
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-xl flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('add_new_commission_rule', { defaultValue: 'Nova Regra de Comissionamento' })}</SheetTitle>
          <SheetDescription className="sr-only">
            Formulário para criar uma nova regra de comissionamento.
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 flex-1 overflow-y-auto">
          <CommissionRuleForm 
            onSubmit={handleSubmit} 
            isSubmitting={mutation.isPending} 
            isEditing={false}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AddCommissionRuleSheet;