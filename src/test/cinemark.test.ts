import { describe, expect, it } from "vitest";
import { parseBillboard, parseVersion, youtubeUrl } from "@/lib/cinemark";
import { availableDates, dayLabel, filterMovies, group, type Filters, type Movie } from "@/lib/movies";

const TODAY = "2026-10-19";

// Same shape as https://api.cinemarkca.com/api/vista/data/billboard?cinema_id=774 (invented values).
const session = (day: string, hour: string) => ({ id: `${day}${hour}`, showtime: `${day}T${hour}`, day, hour, seats_available: 50 });
const film = (over: Record<string, unknown>) => ({
  title: "Street Fighter", trailer_url: "https://www.youtube.com/watch?v=abcdefghijk", graphic_url: "",
  runtime: "117", rating: "+13", film_HO_code: "000123", corporate_film_id: "000123",
  synopsis: "Sinopsis oficial.", opening_date: "2026-10-16T00:00:00",
  cast: [
    { ID: "1", FirstName: "Jane", LastName: "Doe", PersonType: "Actor" },
    { ID: "2", FirstName: "John", LastName: "Roe", PersonType: "Actor" },
    { ID: "3", FirstName: "Dir", LastName: "Ector", PersonType: "Director" },
  ],
  movie_versions: [
    { title: "Street Fighter (2D SUB XD DBOX -HN)", sessions: [session("2026-10-19", "20:00:00"), session("2026-10-20", "20:00:00")] },
    { title: "Street Fighter (2D DOB -HN)", sessions: [session("2026-10-19", "18:00:00"), session("2026-10-19", "15:30:00")] },
  ],
  ...over,
});
const billboard = [
  { date: "2026-10-19", movies: [film({}), film({ title: "Gran Estreno", corporate_film_id: "999", film_HO_code: "999", opening_date: "2026-10-23T00:00:00", movie_versions: [{ title: "Gran Estreno (3D SUB IV -HN)", sessions: [session("2026-10-22", "21:00:00")] }] })] },
  { date: "2026-10-20", movies: [film({})] },
];

describe("parseVersion", () => {
  it("extracts technology and audio badges from the version title", () => {
    expect(parseVersion("Street Fighter (2D SUB XD DBOX -HN)")).toEqual({ formats: ["2D", "XD", "D-BOX"], audio: "SUB" });
    expect(parseVersion("Algo (3D DOB IV -HN)")).toEqual({ formats: ["3D", "IV"], audio: "DOB" });
  });
  it("only reads the trailing parenthesis, and guesses nothing", () => {
    expect(parseVersion("XD Adventures (2D -HN)")).toEqual({ formats: ["2D"], audio: undefined });
  });
});

describe("youtubeUrl", () => {
  it("keeps YouTube links and drops everything else", () => {
    expect(youtubeUrl("https://youtu.be/abcdefghijk")).toBe("https://youtu.be/abcdefghijk");
    expect(youtubeUrl("https://www.youtube.com/embed/abcdefghijk")).toBe("https://www.youtube.com/watch?v=abcdefghijk");
    expect(youtubeUrl("abcdefghijk")).toBe("https://www.youtube.com/watch?v=abcdefghijk");
    expect(youtubeUrl("https://evil.example/video")).toBeUndefined();
    expect(youtubeUrl("")).toBeUndefined();
  });
});

describe("parseBillboard", () => {
  const out = parseBillboard(billboard, "citymall", TODAY);
  const sf = out.find((l) => l.title === "Street Fighter")!;
  const estreno = out.find((l) => l.title === "Gran Estreno")!;

  it("merges the same movie across dates into one listing with every date", () => {
    expect(out).toHaveLength(2);
    expect([...new Set(sf.showtimes.map((s) => s.date))]).toEqual(["2026-10-19", "2026-10-20"]);
  });
  it("maps metadata, cast and director", () => {
    expect(sf).toMatchObject({ synopsis: "Sinopsis oficial.", runtime: 117, certification: "+13", director: "Dir Ector", cast: ["Jane Doe", "John Roe"], trailer: "https://www.youtube.com/watch?v=abcdefghijk" });
    expect(sf.poster).toBeUndefined(); // empty graphic_url -> TMDb fills it in later
  });
  it("groups sessions per date/format/audio, sorted by time", () => {
    const dob = sf.showtimes.find((s) => s.audio === "DOB")!;
    expect(dob).toMatchObject({ cinema: "citymall", date: "2026-10-19", formats: ["2D"], times: ["15:30", "18:00"] });
    expect(sf.showtimes.find((s) => s.audio === "SUB")!.formats).toEqual(["2D", "XD", "D-BOX"]);
  });
  it("flags movies that open in the future as pre-sale, and regular ones as not", () => {
    expect(estreno.presale).toBe(true);
    expect(sf.presale).toBe(false);
  });
  it("flags special events by title", () => {
    const [l] = parseBillboard([{ date: TODAY, movies: [film({ title: "PREVENTA: Otra", corporate_film_id: "5", film_HO_code: "5", opening_date: "2026-10-01T00:00:00" })] }], "galerias", TODAY);
    expect(l!.presale).toBe(true);
  });
  it("ignores sessions in the past", () => {
    const [l] = parseBillboard([{ date: "2026-10-18", movies: [film({ movie_versions: [{ title: "X (2D -HN)", sessions: [session("2026-10-18", "20:00:00")] }] })] }], "citymall", TODAY);
    expect(l).toBeUndefined();
  });
  it("throws on an unexpected response so the cinema gets hidden (no invented data)", () => {
    expect(() => parseBillboard({ error: "nope" }, "citymall", TODAY)).toThrow();
    expect(() => parseBillboard("<html>blocked</html>", "citymall", TODAY)).toThrow();
  });
  it("returns nothing for an empty billboard", () => {
    expect(parseBillboard([], "citymall", TODAY)).toEqual([]);
  });
});

describe("views", () => {
  const f: Filters = { cinema: "all", format: "all", audio: "all" };
  const movie = (id: string, presale: boolean, rows: { date: string; formats: ("2D" | "XD")[] }[]): Movie => ({
    id, title: id, poster: "", synopsis: "", director: "", cast: [], rating: 0, runtime: 0, presale,
    showtimes: rows.flatMap((r) => group("citymall", [{ ...r, audio: "SUB", time: "20:00" }])),
  });
  const movies = [
    movie("regular", false, [{ date: "2026-10-19", formats: ["2D"] }, { date: "2026-10-21", formats: ["2D", "XD"] }]),
    movie("upcoming", true, [{ date: "2026-10-23", formats: ["2D"] }]),
  ];

  it("lists the days that have sessions, today onwards", () => {
    expect(availableDates(movies.filter((m) => !m.presale), TODAY)).toEqual(["2026-10-19", "2026-10-21"]);
    expect(availableDates(movies, "2026-10-20")).toEqual(["2026-10-21", "2026-10-23"]);
  });
  it("shows only the chosen day in Cartelera and pre-sales on their own tab", () => {
    expect(filterMovies(movies, f, { presale: false, date: "2026-10-19" }).map((m) => m.id)).toEqual(["regular"]);
    expect(filterMovies(movies, f, { presale: false, date: "2026-10-20" })).toEqual([]);
    expect(filterMovies(movies, f, { presale: true }).map((m) => m.id)).toEqual(["upcoming"]);
  });
  it("filters by any of a session's formats", () => {
    expect(filterMovies(movies, { ...f, format: "XD" }, { presale: false, date: "2026-10-21" })).toHaveLength(1);
    expect(filterMovies(movies, { ...f, format: "XD" }, { presale: false, date: "2026-10-19" })).toHaveLength(0);
  });
  it("labels days", () => {
    expect(dayLabel("2026-10-19", TODAY)).toBe("Hoy");
    expect(dayLabel("2026-10-20", TODAY)).toBe("Mañana");
  });
});
