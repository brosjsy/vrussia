/* The driving theory exam on the portal (the traffic police's written test): a paper of 20 questions on the rules of the road, with three answers
   each; two mistakes at most. It is the gate to the car: no pass, no practical exam, no licence; no licence, no buying a car and no driving one.
   The rules here are the usual ones taught in a Russian driving school (a simplified set: check the current Rules of the Road).
   Pass: `flags.theory` is set (and an exchange of a foreign licence or the practical exam can follow). Fail: wait a week, and pay a retake fee. */
import type { State } from './engine';
import { isForeigner } from './engine';

type Bi = [string, string];
/** A question: its text, three answers, the index of the right one, and why (shown after the exam). */
export type Q = [Bi, [Bi, Bi, Bi], number, Bi];

export const QUESTIONS: Q[] = [
  [['What is the usual speed limit for cars in a built-up area?', 'Какова обычная разрешённая скорость легковых автомобилей в населённом пункте?'], [['60 km/h', '60 км/ч'], ['90 km/h', '90 км/ч'], ['40 km/h', '40 км/ч']], 0, ['60 km/h, unless a sign says otherwise.', '60 км/ч, если знаком не установлено иное.']],
  [['How fast may you drive in a residential yard zone?', 'С какой скоростью можно ехать в жилой зоне (двор)?'], [['20 km/h at most', 'Не более 20 км/ч'], ['40 km/h at most', 'Не более 40 км/ч'], ['60 km/h at most', 'Не более 60 км/ч']], 0, ['In a residential zone the limit is 20 km/h and pedestrians have priority everywhere.', 'В жилой зоне — не более 20 км/ч, пешеходы имеют преимущество везде.']],
  [['Who must wear a seat belt?', 'Кто обязан быть пристёгнут ремнём безопасности?'], [['The driver only', 'Только водитель'], ['The driver and all passengers', 'Водитель и все пассажиры'], ['Only the front passengers', 'Только пассажиры спереди']], 1, ['The driver and all passengers, in the front and in the back.', 'Водитель и все пассажиры, и спереди, и сзади.']],
  [['A red traffic light is on and there is no one on the road. What do you do?', 'Горит красный сигнал светофора, на дороге никого нет. Что делать?'], [['Go carefully', 'Ехать осторожно'], ['Stop and wait for green', 'Остановиться и ждать зелёного'], ['Go if the road is clear on the left', 'Ехать, если слева свободно']], 1, ['Red means stop, always. Running a red light is a heavy fine.', 'Красный — стоп, всегда. Проезд на красный — крупный штраф.']],
  [['What must you do at a pedestrian crossing when a person is on it or about to step on it?', 'Что нужно сделать перед пешеходным переходом, если на нём пешеход или он собирается его перейти?'], [['Sound the horn and go on', 'Посигналить и ехать дальше'], ['Give way to the pedestrian', 'Уступить дорогу пешеходу'], ['Speed up to pass first', 'Ускориться, чтобы проехать первым']], 1, ['You must give way to pedestrians on a marked crossing.', 'На нерегулируемом переходе нужно уступить пешеходам.']],
  [['Which sign means you must stop and give way (a red octagon, STOP)?', 'Что означает знак «STOP» (красный восьмиугольник)?'], [['Slow down and look', 'Притормозить и посмотреть'], ['Stop at the line, then go when it is safe', 'Остановиться у линии, ехать, когда безопасно'], ['Stopping is forbidden', 'Остановка запрещена']], 1, ['You must make a full stop at the stop line and give way to traffic on the main road.', 'Нужно полностью остановиться у стоп-линии и уступить главной дороге.']],
  [['At an unmarked crossroads of equal roads, who has priority?', 'На равнозначном перекрёстке без знаков кто имеет преимущество?'], [['The one on the right', 'Тот, кто справа'], ['The faster car', 'Более быстрая машина'], ['The one on the left', 'Тот, кто слева']], 0, ['At equal junctions you give way to vehicles coming from the right.', 'На равнозначном перекрёстке уступают транспорту, приближающемуся справа.']],
  [['How far from a pedestrian crossing is parking forbidden?', 'На каком расстоянии до пешеходного перехода запрещена стоянка?'], [['1 metre', '1 метр'], ['5 metres', '5 метров'], ['20 metres', '20 метров']], 1, ['Stopping and parking is forbidden within 5 metres before a crossing.', 'Остановка и стоянка запрещены ближе 5 метров до пешеходного перехода.']],
  [['Which alcohol level is allowed for a driver?', 'Какое содержание алкоголя допускается у водителя?'], [['A small glass of wine', 'Бокал вина'], ['Practically none: do not drink and drive', 'Практически нулевое: не пить за рулём'], ['Anything under 1 litre of beer', 'Меньше литра пива']], 1, ['Drive sober. A drunk driver loses the licence and may face criminal charges.', 'За руль — трезвым. Пьяный водитель теряет права и может ответить уголовно.']],
  [['Your car breaks down on the road in a town. How far behind it do you put the warning triangle?', 'Машина встала на дороге в городе. На каком расстоянии ставят знак аварийной остановки?'], [['At least 15 metres', 'Не менее 15 метров'], ['1 metre', '1 метр'], ['Not at all in a town', 'В городе не ставят']], 0, ['15 m in a built-up area, 30 m outside of it.', '15 м в населённом пункте и 30 м вне него.']],
  [['May you sound the horn in a town?', 'Можно ли сигналить в городе?'], [['Yes, whenever you like', 'Да, когда захочется'], ['Only to prevent an accident', 'Только чтобы предотвратить ДТП'], ['Only at night', 'Только ночью']], 1, ['In a built-up area the horn is only for preventing an accident.', 'В населённом пункте сигнал допустим только для предотвращения ДТП.']],
  [['What is the maximum speed when towing another car on a flexible hitch?', 'Какая максимальная скорость при буксировке на гибкой сцепке?'], [['50 km/h', '50 км/ч'], ['90 km/h', '90 км/ч'], ['110 km/h', '110 км/ч']], 0, ['When towing, do not exceed 50 km/h.', 'При буксировке — не более 50 км/ч.']],
  [['Where may you overtake?', 'Где разрешён обгон?'], [['On a pedestrian crossing', 'На пешеходном переходе'], ['On a clear straight road with a dashed line', 'На свободной прямой дороге с прерывистой линией'], ['At a level crossing', 'На железнодорожном переезде']], 1, ['Overtaking is forbidden on crossings, at level crossings and where the line is solid.', 'Обгон запрещён на переходах, переездах и при сплошной линии.']],
  [['When must the dipped headlights be on?', 'Когда нужно включать ближний свет фар?'], [['Only at night', 'Только ночью'], ['Always while the vehicle is moving', 'Всегда при движении'], ['Only in rain', 'Только в дождь']], 1, ['Since the rules changed, dipped beam or daytime lights are on whenever you drive.', 'Ближний свет или ДХО включены при любом движении.']],
  [['At what age must a child travel in a child seat?', 'Детей какого возраста нужно возить в детском удерживающем устройстве?'], [['Under 7 years', 'До 7 лет'], ['Only under 1 year', 'Только до 1 года'], ['Never, a belt is enough', 'Никогда, достаточно ремня']], 0, ['Children under 7 ride in a suitable child restraint (and up to 11 in the front seat).', 'Дети до 7 лет — в детском кресле (до 11 лет на переднем сиденье тоже).']],
  [['What is the minimum tread depth of summer car tyres?', 'Какая минимальная глубина протектора летних шин легкового автомобиля?'], [['0.5 mm', '0,5 мм'], ['1.6 mm', '1,6 мм'], ['3 mm', '3 мм']], 1, ['1.6 mm for cars (4 mm for winter tyres).', '1,6 мм для легковых (4 мм для зимних).']],
  [['A tram is coming at a crossroads and you want to turn. Who goes first?', 'На перекрёстке приближается трамвай, вы поворачиваете. Кто проезжает первым?'], [['You', 'Вы'], ['The tram, on equal roads', 'Трамвай, на равнозначных дорогах'], ['Whoever is quicker', 'Кто быстрее']], 1, ['A tram has priority over cars on equal roads when you turn.', 'Трамвай имеет преимущество перед машинами на равнозначных дорогах.']],
  [['What does a solid white line on the edge of the road mean?', 'Что означает сплошная белая линия по краю дороги?'], [['The edge of the carriageway', 'Край проезжей части'], ['A bus lane', 'Полоса для автобусов'], ['A place to park', 'Место для стоянки']], 0, ['It marks the edge of the road: do not drive over it.', 'Она обозначает край проезжей части: не заезжать.']],
  [['What does a blue round sign with a white arrow pointing right mean?', 'Что означает синий круглый знак с белой стрелкой вправо?'], [['You may only go right', 'Движение только направо'], ['Turn right is forbidden', 'Поворот направо запрещён'], ['A parking place on the right', 'Парковка справа']], 0, ['Blue round signs give an order: here, go only to the right.', 'Синие круглые знаки предписывают: здесь — только направо.']],
  [['What does a red circle with a white bar in the middle (a "brick") mean?', 'Что означает красный круг с белой полосой внутри («кирпич»)?'], [['No entry', 'Въезд запрещён'], ['Parking', 'Парковка'], ['Main road', 'Главная дорога']], 0, ['No entry for vehicles.', 'Въезд всех транспортных средств запрещён.']],
  [['You are on a main road marked with a yellow diamond. What does that give you?', 'Вы на дороге со знаком «Главная дорога» (жёлтый ромб). Что это даёт?'], [['Priority at the crossroads', 'Преимущество на перекрёстке'], ['The right to exceed the speed', 'Право превышать скорость'], ['The right to park anywhere', 'Право парковаться где угодно']], 0, ['A main road gives you priority at junctions with minor roads.', 'Главная дорога даёт преимущество на перекрёстках со второстепенными.']],
  [['An ambulance with a flashing blue light and a siren is behind you. What do you do?', 'Сзади — скорая с мигалкой и сиреной. Что делать?'], [['Speed up', 'Прибавить скорость'], ['Give way and let it pass', 'Уступить дорогу, пропустить'], ['Ignore it', 'Не обращать внимания']], 1, ['Give way to emergency vehicles with the signals on.', 'Нужно уступить транспорту со спецсигналами.']],
  [['Which documents must the driver carry?', 'Какие документы водитель обязан возить с собой?'], [['Licence and the vehicle registration certificate', 'Водительское удостоверение и свидетельство о регистрации ТС'], ['Only a passport', 'Только паспорт'], ['None, all is in the database', 'Никаких, всё в базе']], 0, ['Carry the licence and the vehicle registration (and insurance, in paper or electronic form).', 'С собой — права и СТС (и полис ОСАГО, бумажный или электронный).']],
  [['What does the compulsory OSAGO insurance cover?', 'Что покрывает обязательная страховка ОСАГО?'], [['Damage you cause to other people and their cars', 'Вред, причинённый вами другим людям и их машинам'], ['Theft of your car', 'Угон вашей машины'], ['Damage to your own car', 'Повреждение вашей машины']], 0, ['OSAGO pays for harm to others; your own car needs separate insurance.', 'ОСАГО возмещает вред другим; свою машину страхуют отдельно (КАСКО).']],
  [['After an accident with no injuries and a simple dispute, what is the quickest way?', 'После ДТП без пострадавших и без споров — как быстрее всего?'], [['Leave the place', 'Уехать с места'], ['Fill in a Europrotocol, taking photos', 'Оформить европротокол, сделав фото'], ['Argue with the other driver', 'Спорить с другим водителем']], 1, ['The Europrotocol saves hours; leaving the scene is a serious offence.', 'Европротокол экономит часы; оставление места ДТП — серьёзное нарушение.']],
  [['Fog: what lights do you use?', 'Туман: какие огни включают?'], [['Dipped headlights and fog lights', 'Ближний свет и противотуманные фары'], ['Main beam only', 'Только дальний свет'], ['Hazard lights while moving', 'Аварийку при движении']], 0, ['Dipped beam and fog lights; main beam makes it worse.', 'Ближний и противотуманные; дальний только слепит в тумане.']],
  [['Black ice on the road. How should you brake?', 'Гололёд. Как правильно тормозить?'], [['Hard, with the pedal to the floor', 'Резко, педаль в пол'], ['Early and gently', 'Заранее и плавно'], ['With the handbrake', 'Ручником']], 1, ['Brake early and gently on ice and keep a long distance.', 'На льду тормозят заранее и плавно, держат большую дистанцию.']],
  [['May you use a mobile phone in your hand while driving?', 'Можно ли держать телефон в руке за рулём?'], [['Yes, for short calls', 'Да, для коротких звонков'], ['No, only a hands-free device', 'Нет, только гарнитура / громкая связь'], ['Yes, on a straight road', 'Да, на прямой дороге']], 1, ['Do not hold a phone while driving: it is a fine and a danger.', 'Телефон в руке за рулём — штраф и опасность.']],
  [['What does a yellow flashing light at a crossroads mean?', 'Что означает мигающий жёлтый сигнал светофора?'], [['The crossing is unregulated: follow the signs', 'Перекрёсток нерегулируемый: действуйте по знакам'], ['Stop', 'Остановиться'], ['The road is closed', 'Дорога закрыта']], 0, ['A flashing yellow means no traffic control; follow the priority signs.', 'Мигающий жёлтый — регулирования нет; ориентируйтесь на знаки приоритета.']],
  [['You approach a level crossing and the barrier is going down. What do you do?', 'Вы подъезжаете к переезду, шлагбаум опускается. Что делать?'], [['Cross quickly before it closes', 'Быстро проскочить'], ['Stop before the line and wait', 'Остановиться перед линией и ждать'], ['Go round the barrier', 'Объехать шлагбаум']], 1, ['Never cross when the barrier is down or the light is flashing.', 'Нельзя выезжать на переезд, когда шлагбаум опущен или мигает сигнал.']],
  [['Where must a driver look before reversing?', 'Что нужно сделать перед началом движения задним ходом?'], [['Make sure it is safe and nobody is behind', 'Убедиться, что это безопасно и сзади никого нет'], ['Just sound the horn', 'Просто посигналить'], ['Nothing, the mirror is enough', 'Ничего, зеркала достаточно']], 0, ['Check behind and around; reversing into a crossing is forbidden.', 'Убедитесь в безопасности; на перекрёстках задним ходом ездить нельзя.']],
  [['How do you keep a safe distance in the snow?', 'Как держать дистанцию в снег?'], [['Shorter than in summer', 'Короче, чем летом'], ['Longer than in summer', 'Больше, чем летом'], ['The same as in summer', 'Такую же, как летом']], 1, ['The braking distance is much longer on snow and ice.', 'Тормозной путь на снегу и льду намного длиннее.']],
];

export const EXAM_LEN = 20;
export const MAX_WRONG = 2;
export const RETAKE_DAYS = 7;
export const RETAKE_FEE = 500;

/** One question as the candidate sees it: the answers shuffled, and where the right one landed. */
export interface Item { q: Bi; options: Bi[]; ok: number; why: Bi }

/** Why the player cannot sit the exam now (null when they can). Needs the driving school or a foreign licence; one week between tries. */
export function cannotSit(s: State): string | null {
  if (s.flags.license) return 'You already have a licence.';
  if (s.flags.theory) return 'You have passed the theory. Next: the practical exam (or the exchange of a foreign licence).';
  if (!s.flags.enrolled && !isForeigner(s)) return 'Enrol in a driving school first (the Services app, or wait for a driving school to turn up in town).';
  if (isForeigner(s) && !s.flags.rvp && s.docs.reg <= 0) return 'The traffic police need valid registration for your application.';
  const last = s.marks.theoryFail;
  if (last !== undefined && s.day < last + RETAKE_DAYS) return `You failed the theory. You may try again in ${last + RETAKE_DAYS - s.day} day(s).`;
  if ((s.marks.theoryTries ?? 0) > 0 && s.money < RETAKE_FEE) return `A retake costs ₽${RETAKE_FEE}.`;
  return null;
}

/** Makes a paper of EXAM_LEN questions. `rng` is a function giving 0 to 1 (a test passes a fixed one). */
export function paper(rng: () => number = Math.random): Item[] { return makePaper(QUESTIONS, EXAM_LEN, rng); }
function makePaper(bank: Q[], len: number, rng: () => number): Item[] {
  const idx = bank.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return idx.slice(0, len).map(i => {
    const [q, a, ok, why] = bank[i], order = [0, 1, 2];
    for (let k = 2; k > 0; k--) { const j = Math.floor(rng() * (k + 1)); [order[k], order[j]] = [order[j], order[k]]; }
    return { q, options: order.map(o => a[o]), ok: order.indexOf(ok), why };
  });
}

export interface Graded { passed: boolean; wrong: number; right: number; mistakes: number[]; msg: string }
/** Marks the paper and records the result: a pass opens the practical exam (or the exchange), a fail costs a week and a small retake fee. */
export function grade(s: State, items: Item[], answers: number[]): Graded {
  const reason = cannotSit(s);
  if (reason) return { passed: false, wrong: 0, right: 0, mistakes: [], msg: reason };
  const mistakes = items.map((it, i) => (answers[i] === it.ok ? -1 : i)).filter(i => i >= 0), wrong = mistakes.length, right = items.length - wrong;
  if ((s.marks.theoryTries ?? 0) > 0) s.money -= RETAKE_FEE;
  s.marks.theoryTries = (s.marks.theoryTries ?? 0) + 1;
  if (wrong <= MAX_WRONG) {
    s.flags.theory = true; delete s.marks.theoryFail; s.know = Math.min(100, s.know + 2); s.stress = Math.max(0, s.stress - 8); s.rep = Math.min(100, s.rep + 1);
    return { passed: true, wrong, right, mistakes, msg: `Passed: ${right} of ${items.length}.` };
  }
  s.marks.theoryFail = s.day; s.stress = Math.min(100, s.stress + 8);
  return { passed: false, wrong, right, mistakes, msg: `Failed: ${wrong} mistakes (at most ${MAX_WRONG} allowed). Study the rules and try again in ${RETAKE_DAYS} days.` };
}

export const SCHOOL_FEE = 35000;
export const PRACTICE_DAYS = 14;
/** Enrols in a driving school from the portal: the fee, a valid registration for a foreigner, and the theory lessons start. */
export function enrolSchool(s: State): { ok: boolean; msg: string } {
  if (s.flags.license || s.flags.enrolled) return { ok: false, msg: 'You are already enrolled or licensed.' };
  if (s.money < SCHOOL_FEE) return { ok: false, msg: `The course costs ₽${SCHOOL_FEE}.` };
  if (isForeigner(s) && !s.flags.rvp && s.docs.reg <= 0) return { ok: false, msg: 'The school asks for valid registration.' };
  s.money -= SCHOOL_FEE; s.flags.enrolled = true; s.marks.enrolled = s.day; s.know = Math.min(100, s.know + 2);
  return { ok: true, msg: 'You sign the contract. Study the rules, then take the theory exam here.' };
}
/** Days until the practical exam may be taken (0 when it can be). */
export const practiceIn = (s: State): number => Math.max(0, (s.marks.enrolled ?? 0) + PRACTICE_DAYS - s.day);


/* ---------- the practical exam: road situations on the track and in town ---------- */
export const HAZARDS: Q[] = [
  [['You drive in town at 60 km/h. A ball rolls onto the road from between parked cars. What do you do?', 'Вы едете по городу 60 км/ч. Из-за припаркованных машин на дорогу выкатился мяч. Что делать?'], [['Brake at once and be ready to stop: a child may follow', 'Сразу тормозить, быть готовым остановиться: может выбежать ребёнок'], ['Sound the horn and keep speed', 'Посигналить и ехать дальше'], ['Swerve into the next lane', 'Резко уйти в соседнюю полосу']], 0, ['A ball often means a child is behind it.', 'За мячом нередко выбегает ребёнок.']],
  [['At a green light you see a pedestrian still crossing. You…', 'На зелёный сигнал вы видите, что пешеход ещё заканчивает переход. Вы…'], [['Wait until they are across', 'Пропускаете, пока он не перейдёт'], ['Drive round behind them', 'Объезжаете сзади'], ['Flash the lights to hurry them', 'Мигаете фарами, чтобы поторопить']], 0, ['Pedestrians who have started crossing finish first.', 'Пешеходы, начавшие переход, заканчивают его первыми.']],
  [['Parallel parking: before you reverse out of a space you must…', 'Параллельная парковка: перед выездом задним ходом нужно…'], [['Check mirrors and over the shoulder, signal, then go slowly', 'Посмотреть в зеркала и через плечо, включить поворотник, ехать медленно'], ['Reverse fast to get it over with', 'Быстро выехать, чтобы поскорее закончить'], ['Only sound the horn', 'Только посигналить']], 0, ['Look, signal, and give way to traffic.', 'Осмотреться, включить сигнал, уступить движущимся.']],
  [['The car ahead brakes hard in the rain. Your distance was too short. The best you can do now is…', 'Машина впереди резко тормозит в дождь. Дистанция была мала. Лучше всего…'], [['Brake firmly and steadily, keep the wheel straight', 'Тормозить уверенно и плавно, держать руль прямо'], ['Pump the pedal wildly and turn hard', 'Дёргать педаль и резко рулить'], ['Take your foot off and hope', 'Убрать ногу с педали и надеяться']], 0, ['Keep a longer distance in rain; brake steadily and steer straight.', 'В дождь дистанция больше; тормозить плавно и держать руль прямо.']],
  [['You want to turn left at a junction and an oncoming car is going straight. Who goes first?', 'Вы поворачиваете налево на перекрёстке, навстречу едет машина прямо. Кто проезжает первым?'], [['The oncoming car; you give way', 'Встречная машина, вы уступаете'], ['You, you are turning', 'Вы, вы же поворачиваете'], ['Whoever flashes first', 'Кто первым мигнёт']], 0, ['When turning left, give way to oncoming traffic going straight or right.', 'При повороте налево уступите встречным, едущим прямо или направо.']],
  [['On the exam track the examiner says "start the hill". On a slope the car rolls back. What do you use?', 'На площадке экзаменатор говорит «трогайтесь в горку». Машина откатывается. Что использовать?'], [['The handbrake, then clutch and gas smoothly', 'Ручной тормоз, затем плавно сцепление и газ'], ['More gas only', 'Только больше газа'], ['Nothing, it will stop', 'Ничего, остановится']], 0, ['Use the handbrake to start on a slope without rolling back.', 'Ручник помогает тронуться на подъёме без отката.']],
  [['A bus at a stop signals to pull out. You…', 'Автобус на остановке включил поворотник и трогается. Вы…'], [['Give way to the bus', 'Уступаете автобусу'], ['Speed up to pass in front', 'Прибавляете скорость, чтобы проскочить'], ['Honk and keep going', 'Сигналите и едете']], 0, ['In a built-up area you give way to a bus leaving its stop.', 'В населённом пункте нужно уступить автобусу, отъезжающему от остановки.']],
  [['Dusk, the road is empty, and you are tired. The sensible choice is…', 'Сумерки, дорога пуста, вы устали. Разумно…'], [['Stop in a safe place and rest', 'Остановиться в безопасном месте и отдохнуть'], ['Open the window and push on', 'Открыть окно и ехать дальше'], ['Drive faster to arrive sooner', 'Ехать быстрее, чтобы быстрее приехать']], 0, ['Tiredness is as dangerous as drink: rest.', 'Усталость опасна не меньше алкоголя: отдохните.']],
  [['A pedestrian waves at you from the kerb outside a crossing. You…', 'Пешеход машет вам с тротуара вне перехода. Вы…'], [['Stay alert: slow down and watch them', 'Будете внимательны: снизите скорость и следите за ним'], ['Speed up', 'Прибавите скорость'], ['Close your eyes to the sun', 'Закроете глаза от солнца']], 0, ['Anticipate: a person near the road may step out.', 'Предвидьте: человек у дороги может выйти на проезжую часть.']],
  [['Slippery road, you need to slow down. The best way is…', 'Скользкая дорога, нужно снизить скорость. Лучший способ…'], [['Ease off the gas and use engine braking, then brake lightly', 'Сбросить газ, тормозить двигателем, затем слегка тормозить'], ['Slam the brake', 'Резко нажать тормоз'], ['Pull the handbrake', 'Дёрнуть ручник']], 0, ['Gentle braking keeps the wheels gripping.', 'Плавное торможение сохраняет сцепление колёс.']],
];
export const PRACTICE_LEN = 5;
export const PRACTICE_MAX_WRONG = 1;
export const PRACTICE_RETRY_DAYS = 3;
export const PRACTICE_FEE = 2000;

/** Why the player cannot take the practical exam now (null when they can): theory passed, the school's two weeks done, a few days between tries. */
export function cannotPractise(s: State): string | null {
  if (s.flags.license) return 'You already have a licence.';
  if (!s.flags.theory) return 'Pass the theory exam first.';
  if (!s.flags.enrolled) return 'The practical exam needs a driving school course (a foreign licence is exchanged instead).';
  if (practiceIn(s) > 0) return `Practical driving lessons: the exam opens in ${practiceIn(s)} day(s).`;
  const last = s.marks.practicalFail;
  if (last !== undefined && s.day < last + PRACTICE_RETRY_DAYS) return `You may try again in ${last + PRACTICE_RETRY_DAYS - s.day} day(s).`;
  if (s.money < PRACTICE_FEE && (s.marks.practicalTries ?? 0) > 0) return `A retake costs ₽${PRACTICE_FEE}.`;
  return null;
}
/** A paper of road situations. */
export function practicePaper(rng: () => number = Math.random): Item[] { return makePaper(HAZARDS, PRACTICE_LEN, rng); }
/** Marks the practical exam: a pass gives the licence; a fail costs a few days and a retake fee. */
export function gradePractice(s: State, items: Item[], answers: number[]): Graded {
  const reason = cannotPractise(s);
  if (reason) return { passed: false, wrong: 0, right: 0, mistakes: [], msg: reason };
  const mistakes = items.map((it, i) => (answers[i] === it.ok ? -1 : i)).filter(i => i >= 0), wrong = mistakes.length, right = items.length - wrong;
  if ((s.marks.practicalTries ?? 0) > 0) s.money -= PRACTICE_FEE;
  s.marks.practicalTries = (s.marks.practicalTries ?? 0) + 1;
  if (wrong <= PRACTICE_MAX_WRONG) {
    s.flags.practical = true; s.flags.license = true; delete s.marks.practicalFail; s.stress = Math.max(0, s.stress - 15); s.rep = Math.min(100, s.rep + 3);
    return { passed: true, wrong, right, mistakes, msg: 'Passed: a licence at last.' };
  }
  s.marks.practicalFail = s.day; s.stress = Math.min(100, s.stress + 10);
  return { passed: false, wrong, right, mistakes, msg: 'Failed the practical exam.' };
}

/** True when the player may legally drive and buy a car. */
export const mayDrive = (s: State): boolean => !!s.flags.license;
