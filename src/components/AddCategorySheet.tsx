import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import CategoryForm from "./CategoryForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCategory } from "@/integrations/supabase/categories";
import { showSuccess, showError } from "@/utils/toast";
import { useTranslation } from "react-i18next";

const AddCategorySheet = () => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: createCategory,
    onSuccess: (data) => {
      showSuccess(t('category_created_success', { name: data.nome }));
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setIsOpen(false);
    },
    onError: (error) => {
      showError(t("error_loading_data") + ": " + error.message);
    },
  });

  const handleSubmit = (values: { nome: string; empresa_id?: string }) => {
    mutation.mutate(values);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> {t('add_new_category')}
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('add_new_category')}</SheetTitle>
        </SheetHeader>
        <div className="py-4 flex-1 overflow-y-auto">
          <CategoryForm 
            onSubmit={handleSubmit} 
            isSubmitting={mutation.isPending} 
            isEditing={false}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AddCategorySheet;