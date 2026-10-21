# ♿ Declaración e Integración de Accesibilidad

Creemos que consultar la cartelera de cine de San Pedro Sula debe ser una experiencia fluida, rápida y accesible para todas las personas, independientemente de sus capacidades, dispositivos o tecnologías de asistencia que utilicen.

---

## 🎯 Prioridades

Trabajamos de forma continua para garantizar que la plataforma sea fácil de navegar para todos. Nuestras prioridades clave incluyen:

* **Navegación por Teclado:** Asegurar que todos los elementos interactivos (selectores de fecha, tarjetas de cine, modales y enlaces de boletos) sean alcanzables y utilizables mediante la tecla `Tab` e interactivos con `Enter` / `Espacio`.
* **Lector de Pantalla:** Uso de etiquetas HTML semánticas y atributos ARIA en botones, imágenes de afiches/posters (descripciones `alt` útiles) y estados dinámicos (como la selección de días u horarios pasados).
* **Contraste y Diseño Legible:** Mantener un contraste de color adecuado para facilitar la lectura de títulos, formatos de proyección y horarios tanto en modo oscuro como en pantallas móviles bajo luz solar.
* **Manejo del Foco:** Control explícito del foco dentro del modal de detalles de la película y bloqueo de scroll de fondo para no perder la posición al cerrar.

---

## 🛠️ Expectativas para Contribuidores

Si estás contribuyendo al proyecto con nuevos componentes o mejoras de UI:

1. **Prueba la navegación sin mouse:** Verifica que tus cambios se puedan utilizar usando únicamente el teclado.
2. **Etiquetas claras en imágenes y botones:** No dejes elementos interactivos o afiches sin descripción `alt` o `aria-label`.
3. **Manten el contraste:** Asegúrate de que los colores de texto y fondos sigan las combinaciones de diseño del proyecto.

---

## 📬 Reportar Problemas de Accesibilidad

Si encuentras alguna barrera de accesibilidad que te impida consultar una película o seleccionar un horario, queremos saberlo para solucionarlo lo antes posible.

### Cómo enviar un reporte:
Abre un **Issue** en GitHub utilizando la etiqueta `accessibility` o contáctanos describiendo:
* La tarea que intentabas realizar (ej. "seleccionar un horario en Cinemark").
* Tu navegador, sistema operativo o tecnología de asistencia utilizada (ej. NVDA, VoiceOver, solo teclado).
* El comportamiento observado en comparación con lo esperado.

---

## 🔄 Respuesta y Mantenimiento

* **Atención a reportes:** Revisamos las barreras de accesibilidad reportadas y buscamos dar acuse de recibo en un plazo de **48 a 72 horas**.
* **Responsabilidad:** El proyecto es mantenido de forma comunitaria. Nos comprometemos a priorizar los fallos que bloqueen completamente el uso de la aplicación frente a mejoras cosméticas.

---

## 💻 Entornos Evaluados

La aplicación se prueba y optimiza para:
* **Navegadores:** Google Chrome, Mozilla Firefox, Safari y Microsoft Edge en sus versiones recientes.
* **Dispositivos:** Teléfonos móviles (iOS / Android) y navegadores de escritorio.
* **Entradas:** Pantallas táctiles, mouse y navegación mediante teclado.

---

## 💬 Sugerencias de Mejora

Agradecemos cualquier comentario o recomendación para seguir haciendo que la app sea más accesible. Si tienes sugerencias sobre este documento o sobre la interfaz, puedes abrir una discusión o ticket en este repositorio.
