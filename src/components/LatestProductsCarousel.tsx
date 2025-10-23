import React from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { useLatestProductsOnly } from '@/integrations/supabase/products';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import LatestProductCard from './LatestProductCard';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const LatestProductsCarousel = () => {
  const { t } = useTranslation();
  const { data: products, isLoading, isError } = useLatestProductsOnly();
  
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false, 
    align: 'start',
    dragFree: true,
  });
  
  const [prevBtnDisabled, setPrevBtnDisabled] = React.useState(true);
  const [nextBtnDisabled, setNextBtnDisabled] = React.useState(true);

  const scrollPrev = React.useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = React.useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const onSelect = React.useCallback((emblaApi: any) => {
    setPrevBtnDisabled(!emblaApi.canScrollPrev());
    setNextBtnDisabled(!emblaApi.canScrollNext());
  }, []);

  React.useEffect(() => {
    if (!emblaApi) return;
    onSelect(emblaApi);
    emblaApi.on('reInit', onSelect);
    emblaApi.on('select', onSelect);
  }, [emblaApi, onSelect]);


  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Package className="h-5 w-5" /> {t('latest_products_title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !products || products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Package className="h-5 w-5" /> {t('latest_products_title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 text-muted-foreground">
          {t('no_products_found')}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl flex items-center gap-2">
          <Package className="h-5 w-5" /> {t('latest_products_title')}
        </CardTitle>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={scrollPrev} 
            disabled={prevBtnDisabled}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={scrollNext} 
            disabled={nextBtnDisabled}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="embla overflow-hidden" ref={emblaRef}>
          <div className="embla__container flex touch-pan-y">
            {products.map((product) => (
              <div 
                key={product.id} 
                className={cn(
                  "embla__slide flex-none min-w-0 pl-6 py-4",
                  // Mobile (padrão) 2 colunas: w-1/2
                  // Tablet (sm) 3 colunas: sm:w-1/3
                  // Desktop (md) 4 colunas: md:w-1/4
                  // Desktop (lg) 5 colunas: lg:w-1/5
                  "w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/5"
                )}
              >
                <LatestProductCard product={product} />
              </div>
            ))}
            {/* Adiciona padding no final para o último item não ficar colado na borda */}
            <div className="flex-none w-6"></div> 
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LatestProductsCarousel;