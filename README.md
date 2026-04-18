# PROMSG — Agendar WhatsApp desde iPhone

Página estática para agendar el envío de un mensaje de WhatsApp sin servidores ni dependencias. Funciona abriendo `index.html` en Safari (iPhone, iPad o cualquier navegador).

## Cómo funciona

1. Escribes el mensaje, el teléfono de destino (con código de país) y la fecha/hora.
2. La página genera:
   - Un enlace `https://wa.me/<numero>?text=<mensaje>` que abre WhatsApp con todo prellenado.
   - Un archivo `.ics` con un evento de Calendario que incluye ese mismo enlace y una alerta a la hora elegida.
3. Al llegar la hora, tu iPhone te manda la notificación del Calendario. Tocas el evento, tocas el enlace y WhatsApp se abre con el mensaje listo. Solo falta pulsar "enviar".

## Despliegue (GitHub Pages)

El repo incluye `.github/workflows/pages.yml`, que despliega automáticamente en cada push. **Un solo paso manual la primera vez:**

1. En GitHub: `Settings` → `Pages` → en **Source** selecciona `GitHub Actions`.
2. El siguiente push dispara el workflow `Deploy to GitHub Pages`. La URL aparece en `Actions` → último run → `deploy` → `page_url`, y también en `Settings → Pages`.

## Uso en iPhone

1. Abre la URL de GitHub Pages en Safari (o `index.html` local desde iCloud Drive / AirDrop).
2. Llena el formulario y toca **Generar**.
3. Toca **Descargar recordatorio (.ics)**. Safari ofrecerá abrirlo con Calendario: confirma y añade el evento.
4. Opcional: toca **Abrir WhatsApp ahora** si quieres enviarlo de inmediato en vez de programarlo.

## Notas

- El número se debe escribir en formato internacional sin `+` ni espacios (ej. país `52`, número `5551234567`).
- La hora del evento usa la zona horaria local de tu dispositivo y se guarda en UTC dentro del `.ics`.
- iOS no permite enviar un WhatsApp de forma 100 % autónoma: siempre requerirás un toque final para enviar. Este enfoque reduce los pasos al mínimo sin depender de Atajos.

## Archivos

- `index.html` — formulario y estilos.
- `app.js` — genera la URL de WhatsApp y construye el `.ics` con `VALARM`.
