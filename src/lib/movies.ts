export const CINEMAS = [
  { id: "citymall", name: "Cinemark Citymall", url: "https://www.cinemarkca.com/honduras/cine?tag=774&cine=honduras_-_citymall_san_pedro_sula&no-reminder=true" },
  { id: "galerias", name: "Cinemark Galerías", url: "https://www.cinemarkca.com/honduras/cine?tag=2200&cine=honduras_-_galerias_del_valle&no-reminder=true" },
  { id: "altara", name: "Cinépolis Altara", url: "https://cinepolis.com.hn/cinema/cinepolis-altara/?cinema_selected=1" },
  { id: "megamall", name: "Metrocinema Megamall", url: "https://www.metrocinemas.hn/cartelera/cartelera" },
] as const;

export type CinemaId = (typeof CINEMAS)[number]["id"];
export type Format = "2D" | "3D" | "VIP";
export type Audio = "SUB" | "DOB";
export type Showtime = { cinema: CinemaId; format: Format; audio: Audio; times: string[]; demo?: boolean };
export type Movie = {
  id: string; title: string; poster: string; synopsis: string; director: string;
  cast: string[]; rating: number; runtime: number; showtimes: Showtime[];
  year?: string | undefined; tmdbId?: number | undefined; posterAlt?: string | undefined; certification?: string | undefined;
};

const p = (q: string) => `https://placehold.co/400x600/1a1a1a/e50914?text=${encodeURIComponent(q)}`;

export const MOCK_MOVIES: Movie[] = [
  { id: "m1", title: "Dune: Part Two", poster: p("Dune Part Two"), synopsis: "Paul Atreides unites with the Fremen while on a path of revenge against those who destroyed his family.", director: "Denis Villeneuve", cast: ["Timothée Chalamet", "Zendaya", "Rebecca Ferguson"], rating: 8.5, runtime: 166,
    showtimes: [{ cinema: "citymall", format: "2D", audio: "SUB", times: ["14:00", "17:30", "21:00"] }, { cinema: "altara", format: "VIP", audio: "SUB", times: ["19:00"] }, { cinema: "megamall", format: "2D", audio: "DOB", times: ["15:10", "18:40"] }] },
  { id: "m2", title: "Inside Out 2", poster: p("Inside Out 2"), synopsis: "Riley's mind headquarters is undergoing a sudden demolition to make room for new Emotions.", director: "Kelsey Mann", cast: ["Amy Poehler", "Maya Hawke", "Lewis Black"], rating: 7.7, runtime: 96,
    showtimes: [{ cinema: "galerias", format: "3D", audio: "DOB", times: ["13:00", "15:20"] }, { cinema: "citymall", format: "2D", audio: "DOB", times: ["12:30", "16:00", "18:15"] }, { cinema: "altara", format: "2D", audio: "DOB", times: ["14:45"] }] },
  { id: "m3", title: "Deadpool & Wolverine", poster: p("Deadpool & Wolverine"), synopsis: "Deadpool is recruited by the TVA and teams up with a reluctant Wolverine.", director: "Shawn Levy", cast: ["Ryan Reynolds", "Hugh Jackman", "Emma Corrin"], rating: 7.8, runtime: 128,
    showtimes: [{ cinema: "megamall", format: "3D", audio: "SUB", times: ["20:00"] }, { cinema: "galerias", format: "VIP", audio: "SUB", times: ["18:30", "21:30"] }] },
  { id: "m4", title: "Alien: Romulus", poster: p("Alien Romulus"), synopsis: "Young colonists scavenging a derelict space station come face to face with the most terrifying life form.", director: "Fede Álvarez", cast: ["Cailee Spaeny", "David Jonsson"], rating: 7.3, runtime: 119,
    showtimes: [{ cinema: "altara", format: "2D", audio: "SUB", times: ["16:30", "22:00"] }, { cinema: "citymall", format: "2D", audio: "DOB", times: ["20:15"] }] },
  { id: "m5", title: "Wicked", poster: p("Wicked"), synopsis: "Elphaba and Glinda forge an unlikely friendship in the Land of Oz.", director: "Jon M. Chu", cast: ["Cynthia Erivo", "Ariana Grande"], rating: 7.6, runtime: 160,
    showtimes: [{ cinema: "galerias", format: "2D", audio: "SUB", times: ["15:00", "19:10"] }, { cinema: "megamall", format: "2D", audio: "DOB", times: ["14:20"] }, { cinema: "altara", format: "VIP", audio: "SUB", times: ["20:30"] }] },
  { id: "m6", title: "Moana 2", poster: p("Moana 2"), synopsis: "Moana journeys to the far seas of Oceania after an unexpected call from her wayfinding ancestors.", director: "David Derrick Jr.", cast: ["Auliʻi Cravalho", "Dwayne Johnson"], rating: 7.0, runtime: 100,
    showtimes: [{ cinema: "citymall", format: "3D", audio: "DOB", times: ["11:30", "13:45"] }, { cinema: "megamall", format: "2D", audio: "DOB", times: ["12:00", "16:30"] }] },
];

export type Filters = { cinema: CinemaId | "all"; format: Format | "all"; audio: Audio | "all" };

export function matches(s: Showtime, f: Filters) {
  return (f.cinema === "all" || s.cinema === f.cinema) && (f.format === "all" || s.format === f.format) && (f.audio === "all" || s.audio === f.audio);
}

export function filterMovies(movies: Movie[], f: Filters) {
  const noFilter = f.cinema === "all" && f.format === "all" && f.audio === "all";
  return movies.filter((m) => (m.showtimes.length ? m.showtimes.some((s) => matches(s, f)) : noFilter));
}
