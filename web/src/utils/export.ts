import { Platform } from 'react-native';
import { csvContent, reportHtml } from '../domain/reports';

export async function exportCsv(rows: string[][], filename: string) {
  const content = csvContent(rows);
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else {
    const { File, Paths } = await import('expo-file-system');
    const sharing = await import('expo-sharing');
    if (!await sharing.isAvailableAsync()) throw new Error('Compartir archivos no está disponible en este dispositivo.');
    const file = new File(Paths.cache, filename); file.create({ overwrite: true }); file.write(content);
    await sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Exportar registros' });
  }
}
export async function exportPdf(rows: string[][], title: string) {
  const html = reportHtml(title, rows);
  if (Platform.OS === 'web') {
    const frame = document.createElement('iframe'); frame.title = 'Reporte para impresión'; frame.style.position = 'fixed'; frame.style.width = '0'; frame.style.height = '0'; frame.style.border = '0';
    frame.onload = () => { frame.contentWindow?.addEventListener('afterprint', () => frame.remove(), { once: true }); frame.contentWindow?.print(); };
    frame.srcdoc = html; document.body.appendChild(frame);
  } else {
    const print = await import('expo-print'); const sharing = await import('expo-sharing');
    if (!await sharing.isAvailableAsync()) throw new Error('Compartir archivos no está disponible en este dispositivo.');
    const { uri } = await print.printToFileAsync({ html }); await sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: '.pdf' });
  }
}
