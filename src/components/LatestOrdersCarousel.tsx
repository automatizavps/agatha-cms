import React, { useCallback, useEffect, useRef } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShoppingCart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import LatestOrderCard from './LatestOrderCard';
import { useLatestOrders } from '@/integrations/supabase/useLatestOrders';

interface LatestOrdersCarouselProps {
  companyId: string | undefined;
}

const AUTOPLAY_INTERVAL = 3000; // 3 segundos

const LatestOrdersCarousel: React.FC<LatestOrdersCarouselProps> = ({ companyId }) => {
  const { t } = useTranslation();
  const { data: orders, isLoading, isError } = useLatestOrders(companyId);
  
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
    if (orders && orders.length > 0) {
      startAutoplay();
    }
    
    return () => stopAutoplay();
  }, [orders, startAutoplay, stopAutoplay]);
  
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
            <ShoppingCart className="h-5 w-5" /> {t('latest_orders_title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !orders || orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" /> {t('latest_orders_title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 text-muted-foreground">
          {t('no_orders_found')}
        </CardContent>
      </Card>
    );
  }
  
  const slides = orders;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between p-4 pb-0"> {/* ALTERADO: p-4 pb-0 */}
        <CardTitle className="text-lg flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" /> {t('latest_orders_title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0" ref={containerRef}>
        <div className="embla overflow-hidden" ref={emblaRef}>
          <div className="embla__container flex touch-pan-y">
            {slides.map((order) => (
              <div 
                key={order.id} 
                className={cn(
                  "embla__slide flex-none min-w-0 pl-6 py-4",
                  // Mobile: 1 card (w-full), Tablet: 3 cards (sm:w-1/3), Desktop: 4 cards (md:w-1/4)
                  "w-full sm:w-1/3 md:w-1/4" 
                )}
              >
                <LatestOrderCard order={order} />
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

export default LatestOrdersCarousel;