import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import type { Language, OperationalInterval } from './types'

export async function downloadReport(language: Language, interval: OperationalInterval) {
  const element = document.querySelector<HTMLElement>('[data-report]')
  if (!element) return
  const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#f3f5f4', useCORS: true })
  const image = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const width = 190, height = canvas.height * width / canvas.width
  let offset = 10, remaining = height
  while (remaining > 0) { pdf.addImage(image, 'PNG', 10, offset, width, height); remaining -= 277; if (remaining > 0) { pdf.addPage(); offset = 10 - (height - remaining) } }
  pdf.save(`axion-campana-${language === 'es' ? 'operaciones' : 'operations'}-${interval}h.pdf`)
}
