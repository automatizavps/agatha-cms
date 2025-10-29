import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import PlanForm from "./PlanForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { duplicatePlan, Plan, usePlanModules } from "@/integrations/supabase/plans";
import { showSuccess, showError } from "@/utils/toast";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

interface DuplicatePlanSheetProps {
  plan: Plan;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const DuplicatePlanSheet: React.FC<DuplicatePlanSheetProps> = ({ plan, isOpen, onOpenChange }) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  // Carrega as regras atuais do plano
  const { data: rules, isLoading: isLoadingRules } = usePlanModules(plan.id);

  const mutation = useMutation({
    mutationFn: ({ newName }: { newName: string }) => duplicatePlan(plan.id, newName, queryClient),
    onSuccess: (data) => {
      showSuccess(t('plan_created_success', { name: data.nome }));
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      onOpenChange(false);
    },
    onError: (error) => {
      showError(t("error_loading_data") + ": " + error.message);
    },
  });

  // O formulário de plano será usado no modo de CRIAÇÃO, mas com valores preenchidos
  const handleSubmit = (values: any) => {
    // Chamamos a função de duplicação com o novo nome
    mutation.mutate({ newName: values.nome });
  };
  
  // Valores iniciais para o formulário de duplicação
  const defaultPlanWithRules = {
    ...plan,
    // Novo nome sugerido
    nome: `${plan.nome} (Cópia ${format(new Date(), 'dd/MM')})`,
    // Regras carregadas
    regras: rules || [],
    // Resetamos as datas para o padrão de criação (data de início hoje, data de fim nula/calculada)
    data_inicio: new Date(),
    data_fim: null,
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
          <SheetTitle>{t('add_new_plan')}: {t('duplicate_of', { defaultValue: 'Duplicata de' })} {plan.nome}</SheetTitle>
          <SheetDescription className="sr-only">
            {t('edit_plan_description', { defaultValue: 'Formulário para criar um novo plano baseado em um existente.' })}
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 flex-1 overflow-y-auto">
          <PlanForm 
            onSubmit={handleSubmit} 
            isSubmitting={mutation.isPending} 
            defaultPlan={defaultPlanWithRules}
            isEditing={false} // Importante: forçar modo de criação
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default DuplicatePlanSheet;