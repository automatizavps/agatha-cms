import * as XLSX from 'xlsx';

/**
 * Converte um array de objetos JSON em um arquivo Excel (.xlsx) ou CSV.
 * @param data Array de objetos a serem exportados.
 * @param fileName Nome do arquivo (sem extensão).
 * @param sheetName Nome da aba na planilha.
 * @param format 'xlsx' ou 'csv'.
 */
export const exportToExcel = (data: any[], fileName: string, sheetName: string = 'Dados', format: 'xlsx' | 'csv' = 'xlsx') => {
  if (!data || data.length === 0) {
    console.warn("Nenhum dado para exportar.");
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const fileExtension = format === 'xlsx' ? '.xlsx' : '.csv';
  
  // Escreve o arquivo e força o download
  XLSX.writeFile(workbook, `${fileName}${fileExtension}`, { bookType: format });
};

/**
 * Função auxiliar para formatar dados complexos (nested objects) para exportação.
 * @param data Array de objetos com possíveis aninhamentos.
 * @returns Array de objetos achatados (flat).
 */
export const flattenDataForExport = (data: any[]): any[] => {
  return data.map(item => {
    const flatItem: any = {};
    for (const key in item) {
      if (item.hasOwnProperty(key)) {
        const value = item[key];
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // Se for um objeto aninhado (ex: cliente: { nome: '...' })
          for (const subKey in value) {
            if (value.hasOwnProperty(subKey)) {
              // Cria uma chave composta, ex: 'cliente_nome'
              flatItem[`${key}_${subKey}`] = value[subKey];
            }
          }
        } else if (Array.isArray(value)) {
          // Se for um array (ex: itens), junta os nomes
          flatItem[key] = value.map(v => v.nome || v.id).join('; ');
        } else {
          // Valor simples
          flatItem[key] = value;
        }
      }
    }
    return flatItem;
  });
};