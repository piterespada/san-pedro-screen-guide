# 🎬 Cartelera San Pedro Sula

[![Sitio Web Oficial](https://img.shields.io/badge/🌐_Web_App-cartelera--sps.lovable.app-blueviolet?style=for-the-badge)](https://cartelera-sps.lovable.app/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

Un agregador de cine de alto rendimiento diseñado específicamente para **San Pedro Sula, Honduras**. Consolida en tiempo real la cartelera, preventas, formatos y horarios de las principales cadenas de cines de la ciudad en una sola interfaz fluida e intuitiva.

🔗 **Prueba la aplicación aquí:** [https://cartelera-sps.lovable.app/](https://cartelera-sps.lovable.app/)

---

## ✨ Características Principales

* 🎯 **Cero Datos Falsos (Zero Mock Data):** Todos los cines, funciones y horarios se extraen en tiempo real de sus fuentes oficiales. Si una fuente falla, la sucursal se oculta automáticamente para garantizar integridad total de los datos.
* 🎟️ **Enlaces Directos a Boletos:** Redirección inmediata a la pasarela oficial de compra de cada cine (`Cinemark`, `Cinépolis` y `Metrocinemas Megamall`).
* 🎭 **Elenco e Información Visual (TMDB API):** Integración con la API oficial de *The Movie Database* para renderizar carruseles de reparto con fotografías de actores, sus nombres y personajes.
* 📅 **Navegación de Preventas e Histórico:** Selector de fechas para consultar funciones hasta con 5 días de anticipación y estado visual de horarios para identificar funciones pasadas.
* 📱 **UI/UX Minimalista:** Interfaz responsiva con diseño optimizado, bloqueo de scroll en modal de detalles y tarjetas visuales claras.

---

## 🏛️ Cines Integrados (San Pedro Sula)

| Cadena | Método de Integración |
| :--- | :--- |
| **Cinemark** | JSON API Directa |
| **Cinépolis** | Dynamic DOM Parsing |
| **Metrocinemas** (Megamall) | Direct SSR HTML Scraping |

---

## 🛠️ Tecnologías Utilizadas

* **Frontend:** React, TypeScript, Tailwind CSS
* **APIs Externas:** TMDB API (Metadatos y reparto)
* **Hosting & Deployment:** Lovable Cloud

---

## 🤝 Cómo Contribuir

¡Las contribuciones son bienvenidas! Si deseas proponer una mejora o corregir algún error:

1. Realiza un **Fork** de este repositorio.
2. Crea una rama para tu función (`git checkout -b feature/nueva-mejora`).
3. Realiza tus cambios y haz **Commit** (`git commit -m 'Añade nueva funcionalidad'`).
4. Haz **Push** a la rama (`git push origin feature/nueva-mejora`).
5. Abre un **Pull Request** para revisión.

---

<p center="align">Desarrollado con ❤️ para los cinéfilos de San Pedro Sula 🇭🇳</p>
