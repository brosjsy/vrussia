/* The player's address (round 151): every player lives somewhere real-sounding in their city — a real street and district, an invented house and flat number —
   written the Russian way ("г. Казань, ул. Баумана, д. 43, кв. 112") and the English way ("43 Bauman St, flat 112, Kazan").
   The address follows from who the player is, the city and the kind of home, so it is the same every time and needs nothing saved; moving to another city or
   another kind of home gives a new one. The number of storeys, entrances and flats per landing follow the kind of building (a five-storey khrushchyovka has four
   entrances and four flats a landing, a new tower one entrance and eight). Pure: it reads the state and never changes it. */
import type { State } from './engine';
import type { Building, Dwelling } from './homes';
import { profileOf, hash01 } from './russia';

export interface Address {
  city: string; district: [ru: string, en: string]; street: [ru: string, en: string]; house: number; korpus?: number;
  /** The entrance (подъезд), the floor and the flat; for a house, a room in a kommunalka or a dormitory the meaning is said in `kind`. */
  entrance: number; floor: number; floors: number; flat: number; kind: 'flat' | 'room' | 'dorm' | 'house' | 'village';
  building: Building; ru: string; en: string;
}
/** Storeys, entrances and flats on a landing for each kind of building. */
const SHAPE: Record<Building, { floors: number; entrances: number; perFloor: number }> = {
  khrush: { floors: 5, entrances: 4, perFloor: 4 }, panel9: { floors: 9, entrances: 6, perFloor: 4 }, panel16: { floors: 16, entrances: 3, perFloor: 6 },
  stalinka: { floors: 7, entrances: 3, perFloor: 3 }, newbuild: { floors: 17, entrances: 1, perFloor: 8 }, prerev: { floors: 5, entrances: 2, perFloor: 3 },
  dorm: { floors: 9, entrances: 1, perFloor: 16 }, izba: { floors: 1, entrances: 1, perFloor: 1 }, cottage: { floors: 2, entrances: 1, perFloor: 1 },
};
/** A few village names for a house outside the city (generic, invented). */
const VILLAGES: [string, string][] = [['д. Берёзовка', 'Beryozovka village'], ['с. Никольское', 'Nikolskoye village'], ['д. Ключи', 'Klyuchi village'], ['д. Сосновка', 'Sosnovka village']];

export function addressFor(s: Pick<State, 'name' | 'city' | 'o'>, dwelling: Dwelling, building: Building, cityRu = s.city): Address {
  const seed = `${s.name}|${s.o}|${s.city}|${dwelling}`, r = (k: string): number => hash01(seed + '|' + k);
  const prof = profileOf(s.city), street = prof.streets[Math.floor(r('street') * prof.streets.length)], district = prof.districts[Math.floor(r('district') * prof.districts.length)];
  const shape = SHAPE[building], house = 1 + Math.floor(r('house') * (building === 'newbuild' || building === 'panel16' ? 60 : 140));
  const korpus = building === 'newbuild' || building === 'dorm' || (building === 'panel9' && r('k') < 0.3) ? 1 + Math.floor(r('korpus') * 3) : undefined;
  const entrance = 1 + Math.floor(r('entrance') * shape.entrances), floor = building === 'izba' || building === 'cottage' ? 1 : 1 + Math.floor(r('floor') * shape.floors);
  const onLanding = 1 + Math.floor(r('landing') * shape.perFloor), flat = (entrance - 1) * shape.floors * shape.perFloor + (floor - 1) * shape.perFloor + onLanding;
  const kind: Address['kind'] = dwelling === 'village' ? 'village' : dwelling === 'house' ? 'house' : dwelling === 'dorm' ? 'dorm' : dwelling === 'kommunal' || dwelling === 'shared' ? 'room' : 'flat';
  const k = korpus ? `, корп. ${korpus}` : '', kEn = korpus ? `, bldg ${korpus}` : '';
  let ru: string, en: string;
  if (kind === 'village') { const v = VILLAGES[Math.floor(r('village') * VILLAGES.length)]; ru = `${v[0]}, ул. Центральная, д. ${1 + (house % 40)} (под г. ${cityRu})`; en = `${1 + (house % 40)} Tsentralnaya St, ${v[1]} (near ${s.city})`; }
  else if (kind === 'house') { ru = `г. ${cityRu}, ${street[0]}, д. ${house}`; en = `${house} ${street[1]}, ${s.city}`; }
  else if (kind === 'dorm') { const room = floor * 100 + onLanding; ru = `г. ${cityRu}, ${street[0]}, д. ${house}${k}, общежитие, комн. ${room}`; en = `${house} ${street[1]}${kEn}, dormitory, room ${room}, ${s.city}`; }
  else if (kind === 'room') { const room = 1 + Math.floor(r('room') * 4); ru = `г. ${cityRu}, ${street[0]}, д. ${house}${k}, кв. ${flat}, комн. ${room}`; en = `${house} ${street[1]}${kEn}, flat ${flat}, room ${room}, ${s.city}`; }
  else { ru = `г. ${cityRu}, ${street[0]}, д. ${house}${k}, кв. ${flat}`; en = `${house} ${street[1]}${kEn}, flat ${flat}, ${s.city}`; }
  return { city: s.city, district, street, house, korpus, entrance, floor, floors: shape.floors, flat, kind, building, ru, en };
}
/** The short form for a plate on the house: street and number ("ул. Баумана, 43"). */
export const plateOf = (a: Address, ru: boolean): string => (a.kind === 'village' ? (ru ? a.ru.split(',').slice(0, 2).join(',') : a.en.split('(')[0].trim()) : ru ? `${a.street[0]}, ${a.house}${a.korpus ? ` к${a.korpus}` : ''}` : `${a.house} ${a.street[1]}`);
