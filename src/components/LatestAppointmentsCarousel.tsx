import React, { useCallback, useEffect, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { useLatestAppointments } from '@/integrations/supabase/useLatestAppointments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CalendarCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import LatestAppointmentCard from './LatestAppointmentCard';
import EditAppointmentSheet from './EditAppointmentSheet'; // Importando o Sheet
import { Appointment } from '@/integrations/supabase/appointments'; // Importando o tipo

interface LatestAppointmentsCarouselProps {
  companyId: string | undefined;
}

const AUTOPLAY_INTERVAL = 3000; // 3 segundos

const LatestAppointmentsCarousel: React.FC<LatestAppointmentsCarouselProps> = ({ companyId }) => {
  const { t } = useTranslation();
  const { data: appointments, isLoading, isError } = useLatestAppointments(companyId);
  
  // Estado para gerenciar a edição
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  
  // Configuração do Embla: loop infinito e drag livre
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true, 
    align: 'start',
    dragFree: true,
  });
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  // Lógica de Autoplay
  const startAutoplay = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      scrollNext();
    }, AUTOPLAY_INTERVAL);
  }, [scrollNext]);

  const stopAutoplay = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => {
    if (appointments && appointments.length > 0) {
      startAutoplay();
    }
    
    return () => stopAutoplay();
  }, [appointments, startAutoplay, stopAutoplay]);
  
  // Pausa no hover
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('mouseenter', stopAutoplay);
    container.addEventListener('mouseleave', startAutoplay);

    return () => {
      container.removeEventListener('mouseenter', stopAutoplay);
      container.removeEventListener('mouseleave', startAutoplay);
    };
  }, [startAutoplay, stopAutoplay]);
  
  // Manipulador de clique para abrir a edição
  const handleCardClick = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setIsEditSheetOpen(true);
  };
  
  // Manipulador para fechar o sheet
  const handleCloseEditSheet = (open: boolean) => {
    setIsEditSheetOpen(open);
    if (!open) {
      setEditingAppointment(null);
    }
  };


  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarCheck className="h-5 w-5" /> {t('latest_appointments_title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !appointments || appointments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarCheck className="h-5 w-5" /> {t('latest_appointments_title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 text-muted-foreground">
          {t('no_appointments_found')}
        </CardContent>
      </Card>
    );
  }
  
  const slides = appointments;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between p-4 pb-0">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarCheck className="h-5 w-5" /> {t('latest_appointments_title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0" ref={containerRef}>
          <div className="embla overflow-hidden pl-6 pr-6" ref={emblaRef}>
            <div className="embla__container flex touch-pan-y gap-6">
              {slides.map((appointment) => (
                <div 
                  key={appointment.id} 
                  className={cn(
                    "embla__slide flex-none min-w-0 py-4",
                    // Mobile: 1 card (w-full), Tablet: 3 cards (sm:w-1/3), Desktop: 4 cards (md:w-1/4)
                    "w-full sm:w-1/3 md:w-1/4" 
                  )}
                >
                  <LatestAppointmentCard 
                    appointment={appointment} 
                    onClick={handleCardClick} // Passando o manipulador
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Sheet de Edição */}
      {editingAppointment && (
        <EditAppointmentSheet
          appointment={editingAppointment}
          isOpen={isEditSheetOpen}
          onOpenChange={handleCloseEditSheet}
        />
      )}
    </>
  );
};

export default LatestAppointmentsCarousel;