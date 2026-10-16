/* The colours of the 3D city by season: snow on the ground and on the trees in winter, slush in early spring, fresh green in late spring and summer,
   gold and orange in autumn. The White Nights of Saint Petersburg keep the evening sky bright in June; on some clear winter evenings in northern
   cities the sky shows the northern lights. Pure: the 3D view asks for the look and paints with it. */
export interface SeasonLook { name: 'winter' | 'spring-slush' | 'spring' | 'summer' | 'autumn'; ground: string; field: string; crown: string; snowCrown: boolean; eveningSky: string; aurora: boolean; whiteNight: boolean }
/** Cities far enough north for the northern lights to show now and then. */
export const NORTH = ['Saint Petersburg', 'Murmansk', 'Arkhangelsk', 'Petrozavodsk', 'Norilsk', 'Yakutsk', 'Novosibirsk'];
/** `month` 1 to 12; `slot` 0 morning, 1 afternoon, 2 evening; `day` to choose the evenings with northern lights (about one clear winter evening in four). */
export function seasonLook(month: number, city: string, slot: number, weather: string, day: number): SeasonLook {
  const whiteNight = /petersburg/i.test(city) && month === 6;
  const base = { eveningSky: whiteNight ? '#f3c9a0' : '#3a4a7a', whiteNight, aurora: false, snowCrown: false };
  if (month === 12 || month <= 2) return { ...base, name: 'winter', ground: '#eef3f8', field: '#e4ecf4', crown: '#2f5f45', snowCrown: true, aurora: slot === 2 && weather === 'clear' && NORTH.includes(city) && day % 4 === 0 };
  if (month === 3) return { ...base, name: 'spring-slush', ground: '#a8a493', field: '#9fa58c', crown: '#3c6f48' };
  if (month === 4 || month === 5) return { ...base, name: 'spring', ground: '#9bd68a', field: '#8ccb78', crown: '#4caf50' };
  if (month >= 6 && month <= 8) return { ...base, name: 'summer', ground: '#8fcf7a', field: '#7fbf6a', crown: '#3c8f4a' };
  return { ...base, name: 'autumn', ground: '#b9b07a', field: '#a9a56c', crown: month === 11 ? '#8a6a3a' : '#d9922e' };
}
