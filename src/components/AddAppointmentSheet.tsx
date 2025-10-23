import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CalendarPlus } from "lucide-react";
import AppointmentForm from "./AppointmentForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAppointment } from "@/integrations/supabase/appointments";
import { showSuccess, showError } from "@/utils/toast";

const AddAppointmentSheet = () => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createAppointment,
    onSuccess: () => {
      showSuccess("Agendamento criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setIsOpen(false);
    },
    onError: (error) => {
      showError("Falha ao criar agendamento: " + error.message);
    },
  });

  const handleSubmit = (values: { cliente_nome: string; responsavel_id: string; data_hora: Date }) => {
    mutation.mutate(values);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button>
          <CalendarPlus className="mr-2 h-4 w-4" /> Novo Agendamento
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Novo Agendamento</SheetTitle>
        </SheetHeader>
        <div className="py-4">
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