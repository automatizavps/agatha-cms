import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CalendarPlus } from "lucide-react";
import AppointmentForm from "./AppointmentForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAppointment } from "@/integrations/supabase/appointments";
import { showSuccess, showError } from "@/utils/toast";
import { useTranslation } from "react-i18next";

const AddAppointmentSheet = () => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: createAppointment,
    onSuccess: () => {
      showSuccess("Agendamento criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setIsOpen(false);
    },
    onError: (error) => {
      showError(t("error_loading_data") + ": " + error.message);
    },
  });

  const handleSubmit = (values: { cliente_id: string; responsavel_id: string; data_hora: Date }) => {
    mutation.mutate(values);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button>
          <CalendarPlus className="mr-2 h-4 w-4" /> {t('nav_appointments')}
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('nav_appointments')}</SheetTitle>
        </SheetHeader>
        <div className="py-4 flex-1 overflow-y-auto">
          <AppointmentForm 
            onSubmit={handleSubmit} 
            isSubmitting={mutation.isPending} 
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AddAppointmentSheet;