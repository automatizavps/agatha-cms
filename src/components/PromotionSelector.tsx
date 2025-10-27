import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Tag, Percent, XCircle, Building } from 'lucide-react'; // Adicionado Building
import { useActivePromotions } from '@/integrations/supabase/promotions';
import { Promotion } from '@/integrations/supabase/promotions';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

interface PromotionSelectorProps {
  companyId: string | undefined;
  selectedPromotionId: string | null;
  onPromotionChange: (promotion: Promotion | null) => void;
  disabled?: boolean;
  label?: string;
}

const PromotionSelector: React.FC<PromotionSelectorProps> = ({
  companyId,
  selectedPromotionId,
  onPromotionChange,
  disabled = false,
  label,
}) => {
  const { t } = useTranslation();
  const { data: promotions, isLoading: isLoadingPromotions } = useActivePromotions(companyId);

  // Encontra a promoção selecionada no estado interno
  const currentPromotion = useMemo(() => {
    return promotions?.find(p => p.id === selectedPromotionId) || null;
  }, [promotions, selectedPromotionId]);

  // Opção para "Nenhuma Promoção"
  const NONE_PROMOTION_VALUE = "none";

  const handleSelectChange = (value: string) => {
    if (value === NONE_PROMOTION_VALUE) {
      onPromotionChange(null);
    } else {
      const selected = promotions?.find(p => p.id === value);
      onPromotionChange(selected || null);
    }
  };

  if (isLoadingPromotions) {
    return (
      <div className="space-y-2">
        {label && <Label>{label}</Label>}
        <div className="flex items-center justify-center h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> {t('loading_promotions', { defaultValue: 'Carregando promoções...' })}
        </div>
      </div>
    );
  }

  const hasPromotions = promotions && promotions.length > 0;

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="flex items-center gap-2">
        <Select
          onValueChange={handleSelectChange}
          value={selectedPromotionId || NONE_PROMOTION_VALUE}
          disabled={disabled || !hasPromotions || !companyId}
        >
          <SelectTrigger className={cn("flex-1", !companyId && "bg-muted/50")}>
            <Tag className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder={t('select_promotion', { defaultValue: 'Selecione uma promoção' })} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_PROMOTION_VALUE}>
              {t('no_promotion', { defaultValue: 'Nenhuma Promoção' })}
            </SelectItem>
            {promotions?.map((promo) => (
              <SelectItem key={promo.id} value={promo.id}>
                {promo.nome} ({promo.desconto_percentual}%)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {currentPromotion && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onPromotionChange(null)}
                disabled={disabled}
              >
                <XCircle className="h-4 w-4 text-destructive" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {t('remove_promotion', { defaultValue: 'Remover promoção' })}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      {currentPromotion && (
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <Percent className="h-4 w-4" />
          {t('promotion_applied', {
            defaultValue: 'Promoção "{{promoName}}" aplicada: {{discount}}% de desconto.',
            promoName: currentPromotion.nome,
            discount: currentPromotion.desconto_percentual,
          })}
        </p>
      )}
      {!companyId && (
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <Building className="h-4 w-4" />
          {t('select_company_to_load_promotions', { defaultValue: 'Selecione uma empresa para carregar promoções.' })}
        </p>
      )}
    </div>
  );
};

export default PromotionSelector;