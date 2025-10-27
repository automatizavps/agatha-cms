import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import PromotionForm from "./PromotionForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updatePromotion, Promotion, usePromotionRules, RuleType } from "@/integrations/supabase/promotions";
import { showSuccess, showError } from "@/utils/toast";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

interface EditPromotionSheetProps {
  promotion: Promotion;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditPromotionSheet: React.FC<EditPromotionSheetProps> = ({ promotion, isOpen, onOpenChange }) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  // Carrega as regras atuais da promoção
  const { data: rules, isLoading: isLoadingRules } = usePromotionRules(promotion.id);

  const mutation = useMutation({
    mutationFn: updatePromotion,
    onSuccess: (data) => {
      showSuccess(t('promotion_updated_success', { name: data.nome, defaultValue: 'Promoção atualizada com sucesso!' }));
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      queryClient.invalidateQueries({ queryKey: ["promotionRules", promotion.id] });
      onOpenChange(false);
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
    mutation.mutate({ id: promotion.id, ...values, queryClient });
  };
  
  const defaultPromotionWithRules = {
    ...promotion,
    rules: rules || [],
  };

  if (isLoadingRules) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-xl flex flex-col">
          <SheetHeader>
            <SheetTitle>{t('loading_promotion_data', { defaultValue: 'Carregando dados da promoção...' })}</SheetTitle>
            <SheetDescription className="sr-only">
              {t('loading_promotion_data')}
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
          <SheetTitle>{t('edit_promotion', { defaultValue: 'Editar Promoção' })}: {promotion.nome}</SheetTitle>
          <SheetDescription className="sr-only">
            {t('promotion_form_description')}
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 flex-1 overflow-y-auto">
          <PromotionForm 
            onSubmit={handleSubmit} 
            isSubmitting={mutation.isPending} 
            defaultPromotion={defaultPromotionWithRules}
            isEditing={true}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EditPromotionSheet;