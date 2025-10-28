import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import PlanForm from "./PlanForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updatePlan, Plan, usePlanModules } from "@/integrations/supabase/plans";
import { showSuccess, showError } from "@/utils/toast";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

interface EditPlanSheetProps {
  plan: Plan;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditPlanSheet: React.FC<EditPlanSheetProps> = ({ plan, isOpen, onOpenChange }) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  // Carrega as regras atuais do plano
  const { data: rules, isLoading: isLoadingRules } = usePlanModules(plan.id);

  const mutation = useMutation({
    mutationFn: (values: any) => updatePlan({ id: plan.id, ...values }),
    onSuccess: (data) => {
      showSuccess(t('plan_updated_success', { name: data.nome }));
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      queryClient.invalidateQueries({ queryKey: ["planModules", plan.id] });
      onOpenChange(false);
    },
    onError: (error) => {
      showError(t("error_loading_data") + ": " + error.message);
    },
  });

  const handleSubmit = (values: any) => {
    mutation.mutate({ ...values, queryClient });
  };
  
  const defaultPlanWithRules = {
    ...plan,
    regras: rules || [],
  };

  if (isLoadingRules) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-xl flex flex-col">
          <SheetHeader>
            <SheetTitle>{t('loading_plan_data', { defaultValue: 'Carregando Plano...' })}</SheetTitle>
            <SheetDescription className="sr-only">
              {t('loading_plan_data')}
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
          <SheetTitle>{t('edit_plan', { defaultValue: 'Editar Plano' })}: {plan.nome}</SheetTitle>
          <SheetDescription className="sr-only">
            {t('edit_plan_description', { defaultValue: 'Formulário para editar o plano de assinatura e suas regras.' })}
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 flex-1 overflow-y-auto">
          <PlanForm 
            onSubmit={handleSubmit} 
            isSubmitting={mutation.isPending} 
            defaultPlan={defaultPlanWithRules}
            isEditing={true}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EditPlanSheet;