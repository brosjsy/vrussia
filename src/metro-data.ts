/* The real metro lines of the seven Russian cities that have a metro, with every open station in order, as of October 2026.
   Research (round 124): English Wikipedia — "List of Moscow Metro stations" and the articles of the Solntsevskaya, Serpukhovsko-Timiryazevskaya,
   Lyublinsko-Dmitrovskaya, Bolshaya Koltsevaya, Nekrasovskaya, Troitskaya and Butovskaya lines; "List of Saint Petersburg Metro stations";
   "Nizhny Novgorod Metro", "Novosibirsk Metro", "Kazan Metro", "Samara Metro", "Yekaterinburg Metro". Names are the English transliterations
   those articles use. Not included: the Moscow Central Circle and the Central Diameters (railway lines run with the metro), stations under
   construction (Samara: Samarskaya; Yekaterinburg: Bazhovskaya, built but never opened; Kazan: the second line; Moscow: the Troitsk extension,
   the Rublyovo-Arkhangelskaya line) and the closed Delovoy Tsentr–Park Pobedy section of the Solntsevskaya line (closed since 2024).
   Colours are the usual line colours of the maps. Where two lines meet at stations with different names, `links` joins them. */

export interface MetroLine { id: string; num: string; name: string; color: string; ring?: boolean; stations: string[] }
export interface MetroSystem { city: string; lines: MetroLine[]; links: [string, string][] }

const line = (id: string, num: string, name: string, color: string, stations: string, ring = false): MetroLine => ({ id, num, name, color, ring, stations: stations.split(', ') });

export const METRO: MetroSystem[] = [
  { city: 'Moscow', lines: [
    line('m1', '1', 'Sokolnicheskaya', '#EF161E', 'Bulvar Rokossovskogo, Cherkizovskaya, Preobrazhenskaya Ploshchad, Sokolniki, Krasnoselskaya, Komsomolskaya, Krasnye Vorota, Chistye Prudy, Lubyanka, Okhotny Ryad, Biblioteka Imeni Lenina, Kropotkinskaya, Park Kultury, Frunzenskaya, Sportivnaya, Vorobyovy Gory, Universitet, Prospekt Vernadskogo, Yugo-Zapadnaya, Troparyovo, Rumyantsevo, Salaryevo, Filatov Lug, Prokshino, Olkhovaya, Novomoskovskaya, Potapovo'),
    line('m2', '2', 'Zamoskvoretskaya', '#2DBE2C', 'Khovrino, Belomorskaya, Rechnoy Vokzal, Vodny Stadion, Voykovskaya, Sokol, Aeroport, Dinamo, Belorusskaya, Mayakovskaya, Tverskaya, Teatralnaya, Novokuznetskaya, Paveletskaya, Avtozavodskaya, Tekhnopark, Kolomenskaya, Kashirskaya, Kantemirovskaya, Tsaritsyno, Orekhovo, Domodedovskaya, Krasnogvardeyskaya, Alma-Atinskaya'),
    line('m3', '3', 'Arbatsko-Pokrovskaya', '#0078BE', 'Pyatnitskoye Shosse, Mitino, Volokolamskaya, Myakinino, Strogino, Krylatskoye, Molodyozhnaya, Kuntsevskaya, Slavyansky Bulvar, Park Pobedy, Kiyevskaya, Smolenskaya, Arbatskaya, Ploshchad Revolyutsii, Kurskaya, Baumanskaya, Elektrozavodskaya, Semyonovskaya, Partizanskaya, Izmaylovskaya, Pervomayskaya, Shchyolkovskaya'),
    line('m4', '4', 'Filyovskaya', '#00BFFF', 'Kuntsevskaya, Pionerskaya, Filyovsky Park, Bagrationovskaya, Fili, Kutuzovskaya, Studencheskaya, Moskva-City, Delovoy Tsentr, Kiyevskaya, Smolenskaya, Arbatskaya, Aleksandrovsky Sad'),
    line('m5', '5', 'Koltsevaya (the Circle line)', '#8D5B2D', 'Kiyevskaya, Krasnopresnenskaya, Belorusskaya, Novoslobodskaya, Prospekt Mira, Komsomolskaya, Kurskaya, Taganskaya, Paveletskaya, Dobryninskaya, Oktyabrskaya, Park Kultury', true),
    line('m6', '6', 'Kaluzhsko-Rizhskaya', '#ED9121', 'Medvedkovo, Babushkinskaya, Sviblovo, Botanichesky Sad, VDNKh, Alekseyevskaya, Rizhskaya, Prospekt Mira, Sukharevskaya, Turgenevskaya, Kitay-gorod, Tretyakovskaya, Oktyabrskaya, Shabolovskaya, Leninsky Prospekt, Akademicheskaya, Profsoyuznaya, Novye Cheryomushki, Kaluzhskaya, Belyayevo, Konkovo, Tyoply Stan, Yasenevo, Novoyasenevskaya'),
    line('m7', '7', 'Tagansko-Krasnopresnenskaya', '#943E90', 'Planernaya, Skhodnenskaya, Tushinskaya, Spartak, Shchukinskaya, Oktyabrskoye Pole, Polezhayevskaya, Begovaya, Ulitsa 1905 Goda, Barrikadnaya, Pushkinskaya, Kuznetsky Most, Kitay-gorod, Taganskaya, Proletarskaya, Volgogradsky Prospekt, Tekstilshchiki, Kuzminki, Ryazansky Prospekt, Vykhino, Lermontovsky Prospekt, Zhulebino, Kotelniki'),
    line('m8', '8', 'Kalininskaya', '#FFD702', 'Tretyakovskaya, Marksistskaya, Ploshchad Ilyicha, Aviamotornaya, Shosse Entuziastov, Perovo, Novogireyevo, Novokosino'),
    line('m8a', '8A', 'Solntsevskaya', '#FFD702', 'Park Pobedy, Minskaya, Lomonosovsky Prospekt, Ramenki, Michurinsky Prospekt, Ozyornaya, Govorovo, Solntsevo, Borovskoye Shosse, Novoperedelkino, Rasskazovka, Pykhtino, Aeroport Vnukovo'),
    line('m9', '9', 'Serpukhovsko-Timiryazevskaya', '#A2A5B4', 'Altufyevo, Bibirevo, Otradnoye, Vladykino, Petrovsko-Razumovskaya, Timiryazevskaya, Dmitrovskaya, Savyolovskaya, Mendeleyevskaya, Tsvetnoy Bulvar, Chekhovskaya, Borovitskaya, Polyanka, Serpukhovskaya, Tulskaya, Nagatinskaya, Nagornaya, Nakhimovsky Prospekt, Sevastopolskaya, Chertanovskaya, Yuzhnaya, Prazhskaya, Ulitsa Akademika Yangelya, Annino, Bulvar Dmitriya Donskogo'),
    line('m10', '10', 'Lyublinsko-Dmitrovskaya', '#B3D445', 'Fiztekh, Lianozovo, Yakhromskaya, Seligerskaya, Verkhniye Likhobory, Okruzhnaya, Petrovsko-Razumovskaya, Fonvizinskaya, Butyrskaya, Maryina Roshcha, Dostoyevskaya, Trubnaya, Sretensky Bulvar, Chkalovskaya, Rimskaya, Krestyanskaya Zastava, Dubrovka, Kozhukhovskaya, Pechatniki, Volzhskaya, Lyublino, Bratislavskaya, Maryino, Borisovo, Shipilovskaya, Zyablikovo'),
    line('m11', '11', 'Bolshaya Koltsevaya (the Big Circle)', '#79CDCD', 'Savyolovskaya, Petrovsky Park, CSKA, Khoroshyovskaya, Narodnoye Opolcheniye, Mnyovniki, Terekhovo, Kuntsevskaya, Davydkovo, Aminyevskaya, Michurinsky Prospekt, Prospekt Vernadskogo, Novatorskaya, Vorontsovskaya, Zyuzino, Kakhovskaya, Varshavskaya, Kashirskaya, Klenovy Bulvar, Nagatinsky Zaton, Pechatniki, Tekstilshchiki, Nizhegorodskaya, Aviamotornaya, Lefortovo, Elektrozavodskaya, Sokolniki, Rizhskaya, Maryina Roshcha', true),
    line('m12', '12', 'Butovskaya', '#ACBFE1', 'Bittsevsky Park, Lesoparkovaya, Ulitsa Starokachalovskaya, Ulitsa Skobelevskaya, Bulvar Admirala Ushakova, Ulitsa Gorchakova, Buninskaya Alleya'),
    line('m15', '15', 'Nekrasovskaya', '#DE64A1', 'Nekrasovka, Lukhmanovskaya, Ulitsa Dmitriyevskogo, Kosino, Yugo-Vostochnaya, Okskaya, Stakhanovskaya, Nizhegorodskaya'),
    line('m16', '16', 'Troitskaya', '#03795F', 'Novomoskovskaya, Kommunarka, Kornilovskaya, Tyutchevskaya, Generala Tyuleneva, Universitet Druzhby Narodov, Novatorskaya, Vavilovskaya, Akademicheskaya, Krymskaya, ZIL'),
  ], links: [
    ['Okhotny Ryad', 'Teatralnaya'], ['Teatralnaya', 'Ploshchad Revolyutsii'], ['Biblioteka Imeni Lenina', 'Arbatskaya'], ['Biblioteka Imeni Lenina', 'Aleksandrovsky Sad'], ['Biblioteka Imeni Lenina', 'Borovitskaya'],
    ['Lubyanka', 'Kuznetsky Most'], ['Chistye Prudy', 'Turgenevskaya'], ['Chistye Prudy', 'Sretensky Bulvar'], ['Tverskaya', 'Pushkinskaya'], ['Tverskaya', 'Chekhovskaya'],
    ['Novokuznetskaya', 'Tretyakovskaya'], ['Kurskaya', 'Chkalovskaya'], ['Taganskaya', 'Marksistskaya'], ['Paveletskaya', 'Paveletskaya'], ['Dobryninskaya', 'Serpukhovskaya'],
    ['Novoslobodskaya', 'Mendeleyevskaya'], ['Krasnopresnenskaya', 'Barrikadnaya'], ['Prospekt Mira', 'Prospekt Mira'], ['Sukharevskaya', 'Sukharevskaya'], ['Tsvetnoy Bulvar', 'Trubnaya'],
    ['Proletarskaya', 'Krestyanskaya Zastava'], ['Ploshchad Ilyicha', 'Rimskaya'], ['Kashirskaya', 'Kashirskaya'], ['Bulvar Dmitriya Donskogo', 'Ulitsa Starokachalovskaya'], ['Novoyasenevskaya', 'Bittsevsky Park'],
    ['Delovoy Tsentr', 'Moskva-City'], ['Kakhovskaya', 'Sevastopolskaya'], ['Kakhovskaya', 'Chertanovskaya'], ['Lermontovsky Prospekt', 'Kosino'], ['Vykhino', 'Lermontovsky Prospekt'],
  ] },
  { city: 'Saint Petersburg', lines: [
    line('s1', '1', 'Kirovsko-Vyborgskaya', '#D6083B', 'Devyatkino, Grazhdansky Prospekt, Akademicheskaya, Politekhnicheskaya, Ploshchad Muzhestva, Lesnaya, Vyborgskaya, Ploshchad Lenina, Chernyshevskaya, Ploshchad Vosstaniya, Vladimirskaya, Pushkinskaya, Tekhnologichesky Institut, Baltiyskaya, Narvskaya, Kirovsky Zavod, Avtovo, Leninsky Prospekt, Prospekt Veteranov'),
    line('s2', '2', 'Moskovsko-Petrogradskaya', '#0078C9', 'Parnas, Prospekt Prosvesheniya, Ozerki, Udelnaya, Pionerskaya, Chyornaya Rechka, Petrogradskaya, Gorkovskaya, Nevsky Prospekt, Sennaya Ploshchad, Tekhnologichesky Institut, Frunzenskaya, Moskovskiye Vorota, Elektrosila, Park Pobedy, Moskovskaya, Zvyozdnaya, Kupchino'),
    line('s3', '3', 'Nevsko-Vasileostrovskaya', '#009A49', 'Begovaya, Zenit, Primorskaya, Vasileostrovskaya, Gostiny Dvor, Mayakovskaya, Ploshchad Alexandra Nevskogo I, Yelizarovskaya, Lomonosovskaya, Proletarskaya, Obukhovo, Rybatskoye'),
    line('s4', '4', 'Pravoberezhnaya', '#EA7125', 'Gorny Institut, Spasskaya, Dostoyevskaya, Ligovsky Prospekt, Ploshchad Alexandra Nevskogo II, Novocherkasskaya, Ladozhskaya, Prospekt Bolshevikov, Ulitsa Dybenko'),
    line('s5', '5', 'Frunzensko-Primorskaya', '#702785', 'Komendantsky Prospekt, Staraya Derevnya, Krestovsky Ostrov, Chkalovskaya, Sportivnaya, Admiralteyskaya, Sadovaya, Zvenigorodskaya, Obvodny Kanal, Volkovskaya, Bukharestskaya, Mezhdunarodnaya, Prospekt Slavy, Dunayskaya, Shushary'),
    line('s6', '6', 'Krasnoselsko-Kalininskaya', '#8B5A2B', 'Putilovskaya, Yugo-Zapadnaya'),
  ], links: [
    ['Nevsky Prospekt', 'Gostiny Dvor'], ['Mayakovskaya', 'Ploshchad Vosstaniya'], ['Ploshchad Alexandra Nevskogo I', 'Ploshchad Alexandra Nevskogo II'], ['Vladimirskaya', 'Dostoyevskaya'],
    ['Pushkinskaya', 'Zvenigorodskaya'], ['Sennaya Ploshchad', 'Sadovaya'], ['Sennaya Ploshchad', 'Spasskaya'], ['Sadovaya', 'Spasskaya'], ['Kirovsky Zavod', 'Putilovskaya'],
  ] },
  { city: 'Nizhny Novgorod', lines: [
    line('n1', '1', 'Avtozavodskaya', '#E0373F', 'Gorkovskaya, Moskovskaya, Chkalovskaya, Leninskaya, Zarechnaya, Dvigatel Revolyutsii, Proletarskaya, Avtozavodskaya, Komsomolskaya, Kirovskaya, Park Kultury'),
    line('n2', '2', 'Sormovsko-Meshcherskaya', '#2F6FD6', 'Strelka, Moskovskaya, Kanavinskaya, Burnakovskaya, Burevestnik'),
  ], links: [] },
  { city: 'Novosibirsk', lines: [
    line('v1', '1', 'Leninskaya', '#E0373F', 'Zayeltsovskaya, Gagarinskaya, Krasny Prospekt, Ploshchad Lenina, Oktyabrskaya, Rechnoy Vokzal, Sportivnaya, Studencheskaya, Ploshchad Marksa'),
    line('v2', '2', 'Dzerzhinskaya', '#1F9D55', 'Ploshchad Garina-Mikhaylovskogo, Sibirskaya, Marshala Pokryshkina, Beryozovaya Roshcha, Zolotaya Niva'),
  ], links: [['Krasny Prospekt', 'Sibirskaya']] },
  { city: 'Kazan', lines: [line('k1', '1', 'Central line', '#E0373F', 'Aviastroitelnaya, Severny Vokzal, Yashlek, Kozya Sloboda, Kremlyovskaya, Ploshchad Tukaya, Sukonnaya Sloboda, Ametyevo, Gorki, Prospekt Pobedy, Dubravnaya')], links: [] },
  { city: 'Samara', lines: [line('a1', '1', 'First line', '#E0373F', 'Yungorodok, Kirovskaya, Bezymyanka, Pobeda, Sovetskaya, Sportivnaya, Gagarinskaya, Moskovskaya, Rossiyskaya, Alabinskaya')], links: [] },
  { city: 'Yekaterinburg', lines: [line('e1', '1', 'First line', '#1F9D55', 'Prospekt Kosmonavtov, Uralmash, Mashinostroiteley, Uralskaya, Dinamo, Ploshchad 1905 Goda, Geologicheskaya, Chkalovskaya, Botanicheskaya')], links: [] },
];

export const metroOf = (city: string): MetroSystem | undefined => METRO.find(m => m.city === city);
export const MIN_PER_STOP = 2, MIN_PER_CHANGE = 4;
export interface MetroLeg { line: MetroLine; stops: string[] }
/** The quickest ride between two stations of a city (about 2 minutes a stop and 4 a change), or null. */
export function metroRoute(city: string, from: string, to: string): { legs: MetroLeg[]; minutes: number } | null {
  const m = metroOf(city); if (!m || from === to) return null;
  type Node = string;                                            // "line|station"
  const key = (l: MetroLine, st: string): Node => `${l.id}|${st}`;
  const nodes = new Map<Node, { line: MetroLine; st: string }>();
  for (const l of m.lines) for (const st of l.stations) nodes.set(key(l, st), { line: l, st });
  const sameStation = (st: string): Node[] => m.lines.filter(l => l.stations.includes(st)).map(l => key(l, st));
  const linked = (st: string): string[] => m.links.flatMap(([a, b]) => (a === st ? [b] : b === st ? [a] : []));
  const edges = (n: Node): [Node, number][] => {
    const { line: l, st } = nodes.get(n)!, i = l.stations.indexOf(st), out: [Node, number][] = [];
    const nb = [i - 1, i + 1].map(j => (l.ring ? (j + l.stations.length) % l.stations.length : j)).filter(j => j >= 0 && j < l.stations.length);
    for (const j of nb) out.push([key(l, l.stations[j]), MIN_PER_STOP]);
    for (const o of [...sameStation(st), ...linked(st).flatMap(sameStation)]) if (o !== n) out.push([o, MIN_PER_CHANGE]);
    return out;
  };
  const dist = new Map<Node, number>(), prev = new Map<Node, Node>(), open = new Set<Node>();
  for (const n of sameStation(from)) { dist.set(n, 0); open.add(n); }
  if (!open.size) return null;
  let end: Node | null = null;
  while (open.size) {
    let cur: Node = '', d = Infinity; for (const n of open) { const x = dist.get(n)!; if (x < d) { d = x; cur = n; } }
    open.delete(cur); if (nodes.get(cur)!.st === to) { end = cur; break; }
    for (const [nx, w] of edges(cur)) if (d + w < (dist.get(nx) ?? Infinity)) { dist.set(nx, d + w); prev.set(nx, cur); open.add(nx); }
  }
  if (!end) return null;
  const path: Node[] = []; for (let n: Node | undefined = end; n; n = prev.get(n)) path.unshift(n);
  const legs: MetroLeg[] = [];
  for (const n of path) { const { line: l, st } = nodes.get(n)!; const last = legs[legs.length - 1]; if (last && last.line.id === l.id) last.stops.push(st); else legs.push({ line: l, stops: [st] }); }
  return { legs: legs.filter(g => g.stops.length > 1 || legs.length === 1), minutes: dist.get(end)! };
}
