import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import CustomProfileForm from "./CustomProfileForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCustomProfile } from "@/integrations/supabase/customProfiles";
import { showSuccess, showError } from "@/utils/toast";
import { useTranslation } from "react-i18next";

const AddCustomProfileSheet = () => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: createCustomProfile,
    onSuccess: (data) => {
      showSuccess(t('profile_created_success', { name: data.nome }));
      queryClient.invalidateQueries({ queryKey: ["customProfiles"] });
      setIsOpen(false);
    },
    onError: (error) => {
      showError(t("error_loading_data") + ": " + error.message);
    },
  });

  const handleSubmit = (values: any) => {
    mutation.mutate(values);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> {t('add_new_profile')}
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-xl flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('add_new_profile')}</SheetTitle>
          <SheetDescription className="sr-only">
            {t('profile_name_placeholder', { defaultValue: 'Crie um novo perfil customizado e defina suas permissões.' })}
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 flex-1 overflow-y-auto">
          <CustomProfileForm 
            onSubmit={handleSubmit} 
            isSubmitting={mutation.isPending} 
            isEditing={false}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AddCustomProfileSheet;