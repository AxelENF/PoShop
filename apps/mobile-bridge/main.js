const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const WebSocket = require('ws');
const fs = require('fs');
const crypto = require('crypto');

let mainWindow;
let wss;

const authPath = path.join(__dirname, '../../.bridge_auth.json');
const authToken = crypto.randomUUID();

try {
  fs.writeFileSync(authPath, JSON.stringify({ token: authToken }, null, 2));
  console.log(`✓ Token de autenticación de bridge generado y guardado en .bridge_auth.json.`);
} catch (err) {
  console.error('❌ Error escribiendo token de autenticación:', err);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'icon.png'),
    title: 'SNAPGAD Mobile-Bridge (Local Hardware Connector)'
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Start WebSocket Server on localhost:9099 to bridge the web app to native peripherals
function startWebSocketServer() {
  wss = new WebSocket.Server({ port: 9099 });

  wss.on('connection', (ws) => {
    logToWindow('🔌 Cliente POS web conectado. Esperando handshake de autenticación...');

    ws.isAuthenticated = false;

    // Timeout de 3 segundos para autenticar
    const authTimeout = setTimeout(() => {
      if (!ws.isAuthenticated) {
        logToWindow('❌ Cierre por timeout: Cliente no autenticó el token.');
        ws.send(JSON.stringify({ type: 'AUTH_ERROR', error: 'Authentication timeout.' }));
        ws.close();
      }
    }, 3000);

    ws.on('message', async (message) => {
      try {
        const command = JSON.parse(message);
        
        if (command.type === 'AUTH') {
          if (command.token === authToken) {
            ws.isAuthenticated = true;
            clearTimeout(authTimeout);
            logToWindow('✓ Cliente POS web autenticado exitosamente.');
            ws.send(JSON.stringify({ type: 'AUTH_SUCCESS', message: 'Bridge authentication successful.' }));
          } else {
            logToWindow('❌ Token de autenticación inválido.');
            ws.send(JSON.stringify({ type: 'AUTH_ERROR', error: 'Invalid authentication token.' }));
            ws.close();
          }
          return;
        }

        if (!ws.isAuthenticated) {
          logToWindow('❌ Acceso denegado: Comando enviado antes de autenticar.');
          ws.send(JSON.stringify({ type: 'AUTH_ERROR', error: 'Authentication required.' }));
          ws.close();
          return;
        }

        logToWindow(`📥 Comando recibido: ${command.type}`);

        switch (command.type) {
          case 'PING':
            ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
            break;

          case 'GET_PRINTERS':
            if (mainWindow) {
              const printers = await mainWindow.webContents.getPrintersAsync();
              ws.send(JSON.stringify({ type: 'PRINTERS_LIST', payload: printers }));
              logToWindow(`📤 Enviados ${printers.length} dispositivos de impresión.`);
            }
            break;

          case 'PRINT_RAW':
            const { text, printerName, settings, structuredData } = command.payload;
            const ticketWidth = settings?.ticketWidth || '80mm';

            logToWindow(`🖨️ Despachando impresión a: ${printerName || 'Impresora Predeterminada'} (${ticketWidth})`);
            
            try {
              // Crear una ventana invisible de fondo para el render del ticket
              let printWindow = new BrowserWindow({
                show: false,
                webPreferences: {
                  nodeIntegration: true,
                  contextIsolation: false
                }
              });

              // Convertir el texto plano con acentos y saltos de línea a HTML seguro (fallback)
              const cleanText = text ? text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\n/g, '<br>')
                .replace(/ /g, '&nbsp;') : '';

              let bodyContent = `<div>${cleanText}</div>`;

              if (structuredData) {
                const {
                  title,
                  slogan,
                  rfc,
                  address,
                  folio,
                  date,
                  customer,
                  items,
                  subtotal,
                  iva,
                  ieps,
                  total,
                  paymentMethod,
                  received,
                  change,
                  qrSvg,
                  creditDetails
                } = structuredData;

                const itemsHtml = items.map(item => `
                  <div class="ticket-row item-row">
                    <div class="qty-col">${item.qty}</div>
                    <div class="concept-col">${item.name}</div>
                    <div class="price-col">$${item.total.toFixed(2)}</div>
                  </div>
                `).join('');

                bodyContent = `
                  <div class="ticket-container">
                    <div class="header text-center">
                      <h1 class="title">${title || 'SNAPGAD POS'}</h1>
                      ${slogan ? `<div class="slogan">${slogan}</div>` : ''}
                      ${rfc ? `<div class="sub-header">RFC: ${rfc}</div>` : ''}
                      ${address ? `<div class="sub-header">${address}</div>` : ''}
                    </div>
                    
                    <div class="divider"></div>
                    
                    <div class="info-section">
                      <div><strong>FOLIO:</strong> ${folio}</div>
                      <div><strong>FECHA:</strong> ${date}</div>
                      <div><strong>CLIENTE:</strong> ${customer}</div>
                    </div>
                    
                    <div class="divider"></div>
                    
                    <div class="ticket-row header-row">
                      <div class="qty-col">CANT</div>
                      <div class="concept-col">CONCEPTO</div>
                      <div class="price-col">TOTAL</div>
                    </div>
                    
                    <div class="divider"></div>
                    
                    <div class="items-container">
                      ${itemsHtml}
                    </div>
                    
                    <div class="divider"></div>
                    
                    <div class="totals-section">
                      ${subtotal !== undefined ? `
                        <div class="ticket-row">
                          <div class="qty-col"></div>
                          <div class="concept-col text-right">SUBTOTAL:</div>
                          <div class="price-col">$${subtotal.toFixed(2)}</div>
                        </div>
                      ` : ''}
                      ${iva !== undefined && iva > 0 ? `
                        <div class="ticket-row">
                          <div class="qty-col"></div>
                          <div class="concept-col text-right">IVA TRASLADADO (16%):</div>
                          <div class="price-col">$${iva.toFixed(2)}</div>
                        </div>
                      ` : ''}
                      ${ieps !== undefined && ieps > 0 ? `
                        <div class="ticket-row">
                          <div class="qty-col"></div>
                          <div class="concept-col text-right">IEPS TRASLADADO (8%):</div>
                          <div class="price-col">$${ieps.toFixed(2)}</div>
                        </div>
                      ` : ''}
                      <div class="ticket-row total-row">
                        <div class="qty-col"></div>
                        <div class="concept-col text-right">TOTAL:</div>
                        <div class="price-col">$${total.toFixed(2)}</div>
                      </div>
                    </div>
                    
                    <div class="divider"></div>
                    
                    <div class="payment-section">
                      <div><strong>MÉTODO DE PAGO:</strong> ${paymentMethod}</div>
                      <div><strong>RECIBIDO:</strong> $${received.toFixed(2)}</div>
                      <div><strong>CAMBIO:</strong> $${change.toFixed(2)}</div>
                    </div>
                    
                    ${creditDetails ? `
                      <div class="divider"></div>
                      <div class="text-center bold" style="font-size: 10px; margin-bottom: 4px;">DETALLE DE CRÉDITO Y ADEUDO</div>
                      <div class="divider"></div>
                      <div class="info-section" style="font-size: 9px; line-height: 1.45;">
                        <div style="display: flex; justify-content: space-between;">
                          <span>Límite Crédito:</span>
                          <span>$${creditDetails.creditLimit.toFixed(2)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                          <span>Saldo Anterior:</span>
                          <span>$${creditDetails.previousBalance.toFixed(2)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                          <span>Cargo Compra:</span>
                          <span>$${total.toFixed(2)}</span>
                        </div>
                        <div class="divider" style="margin: 4px 0;"></div>
                        <div style="display: flex; justify-content: space-between; font-weight: bold;">
                          <span>NUEVO SALDO:</span>
                          <span>$${creditDetails.newBalance.toFixed(2)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-top: 2px; color: #333;">
                          <span>FECHA LÍMITE:</span>
                          <span>${new Date(creditDetails.dueDate).toLocaleDateString('es-MX')}</span>
                        </div>
                      </div>
                    ` : ''}
                    
                    <div class="divider"></div>
                    
                    <div class="footer text-center">
                      <div class="bold">¡GRACIAS POR SU COMPRA!</div>
                      <div style="font-size: 8px; margin-top: 4px;">REGULADO BAJO LA NOM-151</div>
                      ${qrSvg ? `
                        <div class="qr-container">
                          ${qrSvg}
                        </div>
                      ` : ''}
                    </div>
                  </div>
                `;
              }

              const htmlContent = `
                <html>
                  <head>
                    <style>
                      @page {
                        margin: 0;
                        size: auto;
                      }
                      body {
                        font-family: 'Courier New', Courier, monospace;
                        font-size: ${ticketWidth === '58mm' ? '10px' : '12px'};
                        line-height: 1.35;
                        margin: 0;
                        padding: ${ticketWidth === '58mm' ? '2px' : '6px'};
                        width: ${ticketWidth === '58mm' ? '190px' : '270px'};
                        color: #000;
                        background-color: #fff;
                        word-break: break-all;
                      }
                      .ticket-container {
                        width: 100%;
                      }
                      .text-center {
                        text-align: center;
                      }
                      .text-right {
                        text-align: right;
                      }
                      .bold {
                        font-weight: bold;
                      }
                      .title {
                        font-size: ${ticketWidth === '58mm' ? '13px' : '15px'};
                        font-weight: 800;
                        margin: 0 0 2px 0;
                      }
                      .slogan {
                        font-size: 9px;
                        font-style: italic;
                        margin-bottom: 4px;
                      }
                      .sub-header {
                        font-size: 8px;
                        color: #333;
                      }
                      .divider {
                        border-top: 1px dashed #000;
                        margin: 6px 0;
                        width: 100%;
                      }
                      .ticket-row {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        width: 100%;
                        margin: 2px 0;
                      }
                      .qty-col {
                        width: 15%;
                        flex-shrink: 0;
                        text-align: left;
                      }
                      .concept-col {
                        width: 60%;
                        flex-grow: 1;
                        text-align: left;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                      }
                      .price-col {
                        width: 25%;
                        flex-shrink: 0;
                        text-align: right;
                        font-weight: bold;
                      }
                      .header-row {
                        font-weight: bold;
                      }
                      .total-row {
                        font-weight: 900;
                        font-size: ${ticketWidth === '58mm' ? '11px' : '13px'};
                        margin-top: 4px;
                      }
                      .info-section, .payment-section {
                        font-size: 9px;
                        line-height: 1.4;
                      }
                      .qr-container {
                        margin: 8px auto;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                      }
                      .qr-container svg {
                        width: 90px;
                        height: 90px;
                      }
                    </style>
                  </head>
                  <body>
                    ${bodyContent}
                  </body>
                </html>
              `;

              printWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));

              printWindow.webContents.on('did-finish-load', () => {
                printWindow.webContents.print({
                  silent: true,
                  deviceName: printerName || ''
                }, (success, failureReason) => {
                  if (success) {
                    logToWindow(`✓ Impresión física completada con éxito en: ${printerName || 'Predeterminada'}`);
                    ws.send(JSON.stringify({ type: 'PRINT_SUCCESS', message: 'Ticket impreso físicamente con éxito.' }));
                  } else {
                    logToWindow(`❌ Fallo de impresión física: ${failureReason}`);
                    ws.send(JSON.stringify({ type: 'PRINT_ERROR', error: failureReason }));
                  }
                  printWindow.close();
                });
              });
            } catch (err) {
              logToWindow(`❌ Error al inicializar ventana de impresión: ${err.message}`);
              ws.send(JSON.stringify({ type: 'PRINT_ERROR', error: err.message }));
            }
            break;

          default:
            logToWindow(`⚠️ Comando desconocido: ${command.type}`);
        }
      } catch (err) {
        logToWindow(`❌ Error al procesar mensaje: ${err.message}`);
      }
    });

    ws.on('close', () => {
      logToWindow('🔌 Cliente POS web desconectado.');
    });
  });

  logToWindow('🚀 Servidor WebSocket de Hardware iniciado en ws://localhost:9099');
}

function logToWindow(logMsg) {
  console.log(logMsg);
  if (mainWindow) {
    mainWindow.webContents.send('log', logMsg);
  }
}

app.on('ready', () => {
  createWindow();
  startWebSocketServer();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  try {
    if (fs.existsSync(authPath)) {
      fs.unlinkSync(authPath);
    }
  } catch (e) {}
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
