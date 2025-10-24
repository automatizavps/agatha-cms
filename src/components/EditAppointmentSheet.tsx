import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import AppointmentForm from "./AppointmentForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateAppointment, Appointment, useAppointmentItems } from "@/integrations/supabase/appointments";
import { showSuccess, showError } from "@/utils/toast";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface EditAppointmentSheetProps {
  appointment: Appointment;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditAppointmentSheet: React.FC<EditAppointmentSheetProps> = ({ appointment, isOpen, onOpenChange }) => {
  const queryClient = useQueryClient();
  const { data: appointmentItems, isLoading: isLoadingItems } = useAppointmentItems(appointment.id);

  const mutation = useMutation({
    mutationFn: updateAppointment,
    onSuccess: () => {
      showSuccess(`Agendamento para ${appointment.clientes?.nome || 'Cliente'} atualizado com sucesso.`);
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      onOpenChange(false);
    },
    onError: (error) => {
      showError("Falha ao atualizar agendamento: " + error.message);
    },
  });

  // A edição de agendamentos só permite alterar o status e dados principais neste componente
  const handleSubmit = (values: { cliente_id: string; responsavel_id: string; data_hora: Date; items: any[]; status?: Appointment['status'] }) => {
    if (!values.status) {
      showError("Status do agendamento é obrigatório.");
      return;
    }
    
    mutation.mutate({
      id: appointment.id,
      cliente_id: values.cliente_id,
      responsavel_id: values.responsavel_id,
      data_hora: values.data_hora,
      status: values.status,
      queryClient: queryClient, // Passando o queryClient
    });
  };

  // Preparar valores iniciais
  const appointmentDate = new Date(appointment.data_hora);
  const initialValues = {
    cliente_id: appointment.cliente_id || "",
    responsavel_id: appointment.responsavel_id || "",
    date: appointmentDate,
    time: format(appointmentDate, "HH:mm"),
    status: appointment.status,
    empresa_id: appointment.empresa_id, // <-- Adicionando empresa_id aqui
    // Mapeamos os itens carregados para o formato esperado pelo AppointmentForm
    items: appointmentItems?.map(item => ({
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
    })) || [],
  };
  
  if (isLoadingItems) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-lg flex flex-col">
          <SheetHeader>
            <SheetTitle>Carregando Agendamento...</SheetTitle>
            <SheetDescription className="sr-only">
              Carregando dados do agendamento para edição.
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
      <SheetContent className="sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>Editar Agendamento</SheetTitle>
          <SheetDescription className="sr-only">
            Formulário para editar os detalhes do agendamento.
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 flex-1 overflow-y-auto">
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