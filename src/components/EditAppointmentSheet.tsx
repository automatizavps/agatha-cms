import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import AppointmentForm from "./AppointmentForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateAppointment, Appointment } from "@/integrations/supabase/appointments";
import { showSuccess, showError } from "@/utils/toast";
import { format } from "date-fns";

interface EditAppointmentSheetProps {
  appointment: Appointment;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditAppointmentSheet: React.FC<EditAppointmentSheetProps> = ({ appointment, isOpen, onOpenChange }) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: updateAppointment,
    onSuccess: () => {
      showSuccess(`Agendamento para ${appointment.cliente_nome} atualizado com sucesso.`);
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      onOpenChange(false);
    },
    onError: (error) => {
      showError("Falha ao atualizar agendamento: " + error.message);
    },
  });

  const handleSubmit = (values: { cliente_nome: string; responsavel_id: string; data_hora: Date; status?: Appointment['status'] }) => {
    if (!values.status) {
      showError("Status do agendamento é obrigatório.");
      return;
    }
    
    mutation.mutate({
      id: appointment.id,
      cliente_nome: values.cliente_nome,
      responsavel_id: values.responsavel_id,
      data_hora: values.data_hora,
      status: values.status,
    });
  };

  // Preparar valores iniciais
  const appointmentDate = new Date(appointment.data_hora);
  const initialValues = {
    cliente_nome: appointment.cliente_nome,
    responsavel_id: appointment.responsavel_id || "",
    date: appointmentDate,
    time: format(appointmentDate, "HH:mm"),
    status: appointment.status,
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Editar Agendamento</SheetTitle>
        </SheetHeader>
        <div className="py-4">
          <AppointmentForm 
            onSubmit={handleSubmit} 
            isSubmitting={mutation.isPending} 
            defaultValues={initialValues}
            isEditing={true}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EditAppointmentSheet;