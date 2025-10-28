import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import PlanForm from "./PlanForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPlan } from "@/integrations/supabase/plans";
import { showSuccess, showError } from "@/utils/toast";
import { useTranslation } from "react-i18next";

const AddPlanSheet = () => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: createPlan,
    onSuccess: (data) => {
      showSuccess(t('plan_created_success', { name: data.nome }));
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      setIsOpen(false);
    },
    onError: (error) => {
      showError(t("error_loading_data") + ": " + error.message);
    },
  });

  const handleSubmit = (values: any) => {
    mutation.mutate({ ...values, queryClient });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> {t('add_new_plan')}
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-xl flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('add_new_plan')}</SheetTitle>
          <SheetDescription className="sr-only">
            {t('plan_name_placeholder', { defaultValue: 'Crie um novo plano de assinatura e defina suas regras.' })}
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 flex-1 overflow-y-auto">
          <PlanForm 
            onSubmit={handleSubmit} 
            isSubmitting={mutation.isPending} 
            isEditing={false}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AddPlanSheet;