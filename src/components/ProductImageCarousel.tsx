import React, { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProductImageCarouselProps {
  photos: string[] | null;
  alt: string;
}

const ProductImageCarousel: React.FC<ProductImageCarouselProps> = ({ photos, alt }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [prevBtnDisabled, setPrevBtnDisabled] = useState(true);
  const [nextBtnDisabled, setNextBtnDisabled] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const onSelect = useCallback((api: any) => {
    setSelectedIndex(api.selectedScrollSnap());
    setPrevBtnDisabled(!api.canScrollPrev());
    setNextBtnDisabled(!api.canScrollNext());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect(emblaApi);
    emblaApi.on('reInit', onSelect);
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('reInit', onSelect);
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  const validPhotos = photos?.filter(url => url) || [];
  const hasMultiplePhotos = validPhotos.length > 1;

  if (validPhotos.length === 0) {
    return (
      <div className="relative h-32 w-full bg-muted/50 flex items-center justify-center">
        <ImageIcon className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative h-32 w-full overflow-hidden">
      <div className="embla h-full" ref={emblaRef}>
        <div className="embla__container flex h-full">
          {validPhotos.map((url, index) => (
            <div key={index} className="embla__slide flex-none min-w-0 w-full h-full">
              <img 
                src={url} 
                alt={`${alt} - Foto ${index + 1}`} 
                // ALTERADO: Usando object-contain para manter a proporção e evitar corte
                className="h-full w-full object-contain object-center" 
              />
            </div>
          ))}
        </div>
      </div>

      {/* Controles de Navegação (Apenas se houver mais de uma foto) */}
      {hasMultiplePhotos && (
        <>
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-1/2 left-2 h-6 w-6 -translate-y-1/2 bg-background/50 hover:bg-background/80 text-foreground/80 hover:text-foreground"
            onClick={scrollPrev} 
            disabled={!emblaApi || prevBtnDisabled}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-1/2 right-2 h-6 w-6 -translate-y-1/2 bg-background/50 hover:bg-background/80 text-foreground/80 hover:text-foreground"
            onClick={scrollNext} 
            disabled={!emblaApi || nextBtnDisabled}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          {/* Dots de Paginação */}
          <div className="absolute bottom-2 left-0 right-0 flex justify-center space-x-1">
            {validPhotos.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-colors",
                  selectedIndex === index ? "bg-primary" : "bg-white/50 hover:bg-white/80"
                )}
                onClick={() => emblaApi && emblaApi.scrollTo(index)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ProductImageCarousel;