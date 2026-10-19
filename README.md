# 🎬 SPS Movie Aggregator

Agregador de carteleras de cine en tiempo real para la ciudad de San Pedro Sula, Honduras. Diseñado para ofrecer una experiencia de usuario fluida y minimalista (estilo SIMKL), conectando de forma directa con las fuentes oficiales de los cines locales.

## 🚀 Características Principales

- **Carteleras 100% Verificadas (Cero Mock Data):** Arquitectura de alta integridad que omite automáticamente cualquier sucursal o conector que falle, evitando datos falsos o de relleno en la interfaz.
- **Multicines Soportados en San Pedro Sula:**
  - **Cinemark** (CityMall / Galerías): Consumo directo de API/JSON oficial.
  - **Cinépolis** (Altara): Extracción estructurada robusta con manejo de formatos y navegación por días.
- **Interfaz Moderna y Organizada:**
  - Pestañas dinámicas separando la cartelera regular, los horarios en filas horizontales y la sección exclusiva de **Preventas**.
  - Badges visuales inteligentes para tipos de audio (**DOB** / **SUB**) y formatos de pantalla (**2D**, **3D**, **XD**, **D-BOX**, **MacroXE**, **Infiniti**).

## 🛠️ Stack Tecnológico

- **Frontend:** React / Vite / Tailwind CSS / TypeScript
- **UI Components:** Lucide Icons, Radix UI primitives.
- **Gestión de Datos:** Fetch API, parsers personalizados de DOM para bypass y normalización de horarios.

## 📌 Reglas del Proyecto

Este proyecto opera bajo un estándar estricto de **cero datos falsos**. Si un proveedor de cine no responde con datos reales y verificados, la sucursal se oculta automáticamente para mantener la integridad de la información mostrada al usuario.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
