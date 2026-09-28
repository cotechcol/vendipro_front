const TICKET_PRINT_CSS = `
  @page { size: 80mm auto; margin: 2mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 76mm;
    margin: 0;
    padding: 0;
    background: white;
  }
  body { font-family: 'Courier New', Courier, monospace; }
  .ticket-receipt {
    width: 72mm;
    padding: 0;
    font-size: 11px;
    line-height: 1.35;
    color: #111;
  }
  .ticket-header { text-align: center; }
  .ticket-logo img { max-height: 48px; max-width: 120px; margin: 0 auto 8px; display: block; object-fit: contain; }
  .ticket-business { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 4px; }
  .ticket-meta { font-size: 10px; color: #444; margin: 1px 0; }
  .ticket-divider { border-top: 1px dashed #999; margin: 10px 0; }
  .ticket-info, .ticket-totals, .ticket-payment { display: flex; flex-direction: column; gap: 3px; }
  .ticket-row { display: flex; justify-content: space-between; gap: 8px; }
  .ticket-mono { font-weight: 700; letter-spacing: 0.05em; }
  .ticket-items-head, .ticket-item { display: grid; grid-template-columns: 28px 1fr auto; gap: 6px; align-items: start; }
  .ticket-items-head { font-weight: 700; font-size: 10px; text-transform: uppercase; margin-bottom: 6px; color: #555; }
  .ticket-item { margin-bottom: 6px; }
  .col-qty { text-align: center; font-weight: 600; }
  .col-desc { min-width: 0; }
  .item-name { font-weight: 600; word-break: break-word; }
  .item-unit { font-size: 9px; color: #666; margin-top: 1px; }
  .col-total { text-align: right; font-weight: 600; white-space: nowrap; }
  .ticket-total { font-size: 13px; font-weight: 700; margin-top: 4px; padding-top: 4px; border-top: 1px solid #ccc; }
  .ticket-change { font-weight: 700; }
  .ticket-footer { text-align: center; }
  .ticket-thanks { font-size: 12px; font-weight: 700; margin-bottom: 4px; }
  .ticket-note { font-size: 9px; color: #666; margin-bottom: 6px; }
  .ticket-brand { font-size: 8px; color: #999; letter-spacing: 0.1em; text-transform: uppercase; }
`

export function printHtmlElement(element: HTMLElement) {
  const iframe = document.createElement('iframe')
  // Ancho real de la tirilla. En 0px el navegador parte cada palabra y la hoja sale larguísima.
  iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:80mm;height:200mm;border:none;'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (!doc) {
    document.body.removeChild(iframe)
    return
  }

  const clone = element.cloneNode(true) as HTMLElement
  clone.classList.remove('ticket-receipt--preview')

  doc.open()
  doc.write(`<!DOCTYPE html><html><head><title>Recibo</title><style>${TICKET_PRINT_CSS}</style></head><body>${clone.outerHTML}</body></html>`)
  doc.close()

  const win = iframe.contentWindow
  if (!win) {
    document.body.removeChild(iframe)
    return
  }

  const print = () => {
    win.focus()
    win.print()
    setTimeout(() => document.body.removeChild(iframe), 1000)
  }

  if (doc.readyState === 'complete') print()
  else iframe.addEventListener('load', print, { once: true })
}
