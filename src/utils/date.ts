import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';

const TIMEZONE = 'America/Sao_Paulo';

/**
 * Formata uma data ISO string (que é UTC do Supabase) para o fuso horário de São Paulo.
 * @param isoString A string de data ISO (UTC).
 * @param formatString O formato desejado (ex: 'dd/MM/yyyy HH:mm').
 * @returns A data formatada no fuso horário de São Paulo.
 */
export const formatToSaoPaulo = (isoString: string, formatString: string = 'dd/MM/yyyy HH:mm'): string => {
  if (!isoString) return 'N/A';
  try {
    // 1. Converte a string ISO (que é UTC) para um objeto Date
    const dateUtc = parseISO(isoString);
    
    // 2. Converte o objeto Date (que é interpretado como local/UTC) para o fuso horário de São Paulo
    const dateSaoPaulo = utcToZonedTime(dateUtc, TIMEZONE);
    
    // 3. Formata a data
    return format(dateSaoPaulo, formatString, { locale: ptBR });
  } catch (e) {
    console.error("Error formatting date:", e);
    return 'Data Inválida';
  }
};

/**
 * Converte um objeto Date local (criado pelo formulário) para UTC, 
 * tratando-o como se estivesse em São Paulo.
 * @param date Objeto Date local.
 * @returns Objeto Date em UTC.
 */
export const convertLocalToUtcSaoPaulo = (date: Date): Date => {
  return zonedTimeToUtc(date, TIMEZONE);
};