import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import CustomProfileForm from "./CustomProfileForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCustomProfile, CustomProfile, useProfilePermissions } from "@/integrations/supabase/customProfiles";
import { showSuccess, showError } from "@/utils/toast";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

interface EditCustomProfileSheetProps {
  profile: CustomProfile;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditCustomProfileSheet: React.FC<EditCustomProfileSheetProps> = ({ profile, isOpen, onOpenChange }) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  // Carrega as permissões atuais do perfil
  const { data: permissions, isLoading: isLoadingPermissions } = useProfilePermissions(profile.id);

  const mutation = useMutation({
    mutationFn: (values: any) => updateCustomProfile({ id: profile.id, ...values }),
    onSuccess: (data) => {
      showSuccess(t('profile_updated_success', { name: data.nome }));
      queryClient.invalidateQueries({ queryKey: ["customProfiles"] });
      queryClient.invalidateQueries({ queryKey: ["profilePermissions", profile.id] });
      onOpenChange(false);
    },
    onError: (error) => {
      showError(t("error_loading_data") + ": " + error.message);
    },
  });

  const handleSubmit = (values: any) => {
    mutation.mutate(values);
  };
  
  const defaultProfileWithPermissions = {
    ...profile,
    permissions: permissions || [],
  };

  if (isLoadingPermissions) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-xl flex flex-col">
          <SheetHeader>
            <SheetTitle>{t('loading_profile_data')}</SheetTitle>
            <SheetDescription className="sr-only">
              {t('loading_profile_data')}
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
          <SheetTitle>{t('edit_profile')}: {profile.nome}</SheetTitle>
          <SheetDescription className="sr-only">
            {t('edit_profile_description', { defaultValue: 'Formulário para editar o perfil customizado e suas permissões.' })}
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 flex-1 overflow-y-auto">
          <CustomProfileForm 
            onSubmit={handleSubmit} 
            isSubmitting={mutation.isPending} 
            defaultProfile={defaultProfileWithPermissions}
            isEditing={true}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EditCustomProfileSheet;