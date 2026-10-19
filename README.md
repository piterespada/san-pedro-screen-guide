# San Pedro Screen Guide

Build a simple movie schedule aggregator web app for San Pedro Sula, Honduras using React and Tailwind CSS. 

Keep the code minimal, clean, and modular to save space.

1. DATA SOURCES & SCOPE:

We have 4 cinema URLs:

- Cinemark Citymall: https://www.cinemarkca.com/honduras/cine?tag=774&cine=honduras_-_citymall_san_pedro_sula&no-reminder=true

- Cinemark Galerias: https://www.cinemarkca.com/honduras/cine?tag=2200&cine=honduras_-_galerias_del_valle&no-reminder=true

- Cinepolis Altara: https://cinepolis.com.hn/cinema/cinepolis-altara/?cinema_selected=1

- Metrocinema Megamall: https://www.metrocinemas.hn/cartelera/cartelera (Note: Metrocinema lists all locations, make sure to filter or parse only the Megamall showtimes).

2. CORE FEATURES:

- Main Page: Display a clean, dark-themed grid (Netflix style) showing movies playing today across these 4 cinemas.

- Filters: Allow filtering by cinema name, format (2D, 3D, VIP), and audio (Subbed/Dubbed).

- Movie Details Modal: When clicking a movie, open a popup showing synopsis, director, cast, IMDb/TMDb rating, runtime, and a tab comparing showtimes across the 4 specific cinemas.

- Daily Refresh: Set up a lightweight server/API route using Cheerio to fetch and parse showtimes from these URLs upon opening the app.

Start by generating the core layout and mock/initial data structure so we can see it working immediately.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://san-pedro-screen-guide.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4a2d4b7c-a6cf-4967-9a10-41b58aadec1d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
