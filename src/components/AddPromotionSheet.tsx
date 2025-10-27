import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import PromotionForm from "./PromotionForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPromotion, RuleType } from "@/integrations/supabase/promotions";
import { showSuccess, showError } from "@/utils/toast";
import { useTranslation } from "react-i18next";

const AddPromotionSheet = () => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: createPromotion,
    onSuccess: (data) => {
      showSuccess(t('promotion_created_success', { name: data.nome, defaultValue: 'Promoção criada com sucesso!' }));
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      setIsOpen(false);
    },
    onError: (error) => {
      showError(t("error_loading_data") + ": " + error.message);
    },
  });

  const handleSubmit = (values: { 
    nome: string; 
    data_inicio: Date; 
    data_fim: Date; 
    desconto_percentual: number; 
    rules: { tipo_regra: RuleType; entidade_id: string }[];
    empresa_id?: string;
  }) => {
    mutation.mutate({ ...values, queryClient });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> {t('add_new_promotion', { defaultValue: 'Nova Promoção' })}
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-xl flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('add_new_promotion', { defaultValue: 'Nova Promoção' })}</SheetTitle>
          <SheetDescription className="sr-only">
            {t('promotion_form_description', { defaultValue: 'Formulário para criar uma nova promoção.' })}
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 flex-1 overflow-y-auto">
          <PromotionForm 
            onSubmit={handleSubmit} 
            isSubmitting={mutation.isPending} 
            isEditing={false}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AddPromotionSheet;