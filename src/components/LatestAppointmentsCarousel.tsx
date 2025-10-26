import React, { useCallback, useEffect, useRef } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { useLatestAppointments } from '@/integrations/supabase/useLatestAppointments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CalendarCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import LatestAppointmentCard from './LatestAppointmentCard';

interface LatestAppointmentsCarouselProps {
  companyId: string | undefined;
}

const AUTOPLAY_INTERVAL = 3000; // 3 segundos

const LatestAppointmentsCarousel: React.FC<LatestAppointmentsCarouselProps> = ({ companyId }) => {
  const { t } = useTranslation();
  const { data: appointments, isLoading, isError } = useLatestAppointments(companyId);
  
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarCheck className="h-5 w-5" /> {t('latest_appointments_title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0" ref={containerRef}>
        <div className="embla overflow-hidden" ref={emblaRef}>
          <div className="embla__container flex touch-pan-y">
            {slides.map((appointment) => (
              <div 
                key={appointment.id} 
                className={cn(
                  "embla__slide flex-none min-w-0 pl-6 py-4",
                  // 1/2 no mobile, 1/3 no tablet, 1/4 no desktop
                  "w-1/2 sm:w-1/3 md:w-1/4" 
                )}
              >
                <LatestAppointmentCard appointment={appointment} />
              </div>
            ))}
            {/* Adiciona padding no final */}
            <div className="flex-none w-6"></div> 
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LatestAppointmentsCarousel;