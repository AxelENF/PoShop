# SNAPGAD POS Agent Instructions (PoShop)

> [!IMPORTANT]
> **REGLA DE ORO DE GOBERNANZA Y EXCELENCIA**
> Como agente AI de desarrollo para SNAPGAD, **NUNCA** debes omitir las siguientes directrices en cada turno:
> 
> ### 1. MEMORIA PERSISTENTE Y BITÁCORA
> - **LEER el Obsidian Vault** antes de realizar cambios de código o proponer nuevas tareas. El archivo principal es:
>   `C:\Users\axelo\OneDrive\Documentos\Obsidian Vault\snapgad\PROYECTOS SNAPGAD\POSHOP\02 - BITÁCORA Y ESTADO DEL PROYECTO.md`
> - **ACTUALIZAR la Bitácora** al final de cada turno. Registra exactamente qué has completado (`[x]`), qué está en progreso (`[/]`), qué fallas encontraste y cuál es el plan inmediato.
> 
> ### 2. IDENTIDAD VISUAL DE ALTO IMPACTO (PREMIUM DESIGN SYSTEM)
> - **Cero Diseños Generales/Chafas**: Toda interfaz debe verse premium, moderna y robusta. Olvídate de colores básicos o interfaces de juguete.
> - **Paleta de Colores & Contraste**: Usa una paleta sofisticada basada en Zinc/Slate con acentos Indigo o Blue de alta legibilidad. Asegura un contraste estricto entre fondos y textos de botones para que **NUNCA** haya texto invisible o apagado.
> - **Legibilidad Profesional**: Tipografías claras, tamaños jerárquicos (ej: `text-[10px] uppercase font-bold tracking-widest` para labels), bordes sutiles (`border-zinc-800`), y estados interactivos pulidos (`hover`, `focus`, `disabled`).
> 
> ### 3. ARQUITECTURA OFFLINE-FIRST Y RESILIENCIA OPERATIVA
> - **Velocidad Extrema**: Las cajas registradoras de retail mexicano no pueden esperar. Toda operación crítica (registro, cálculo, cobro, adeudo) debe ocurrir de forma local e instantánea (latencia < 2ms) usando estados híbridos persistidos en `localStorage` e `IndexedDB`.
> - **Resiliencia Total**: El sistema debe estar blindado contra cortes de luz, caídas de internet o caídas de servidor. Si la red se cae, la caja sigue cobrando, creando clientes y registrando adeudos. La sincronización es un proceso asíncrono que corre en segundo plano sin bloquear al cajero.
> - **Cero Enredos de Inventario**: Antes de mutaciones críticas (desensambles, ajustes masivos), captura siempre un punto de restauración automático.
> 
> ### 4. AUTONOMÍA Y TOMA DE DECISIONES RACIONALES
> - **Resolución Autónoma**: No abrumes al usuario con preguntas sencillas o repetitivas sobre opciones de implementación. Toma la decisión arquitectónica más robusta, escalable y segura por ti mismo basándote en los estándares de Eleventa y grandes cadenas comerciales.
> - **SAT & Fiscal**: Toda transacción comercial debe ser precisa, desglosando correctamente el Subtotal Neto, IVA (16%) e IEPS (8%) sobre precios integrados al público.
