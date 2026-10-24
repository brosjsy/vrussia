/* The story scenes in Russian (round 149), keyed by the scene's id: its title, its text and each choice with the line that follows it. A scene that has
   no Russian here is shown in English, as before. {name} and {home} are filled in as in the English. Started with the first scene of every life. */
export interface SceneRu { title: string; text: string; choices: [string, string][] }
export const SCENES_RU: Record<string, SceneRu> = {
  intro_citizen: { title: 'Добро пожаловать в Россию', text: '{name}, гражданин России. Внутренний паспорт в кармане, приложение «Госуслуги» установлено, метро работает. Впереди два года: учёба, работа, любовь и зима. Цели — на боковой панели.',
    choices: [['Поехали', 'Начинается первый день.']] },
  intro_migrant: { title: 'Казанский вокзал, 05:40', text: '{name}, поезд из {home} только что прибыл. Миграционная карта со штампом. На регистрацию мало времени (15 дней для граждан Таджикистана и Узбекистана, 7 — для большинства остальных), потом медосвидетельствование, медицинская страховка и патент — только после этого можно работать легально. Правила часто меняются — читайте всё дважды.',
    choices: [['Выйти на перрон', 'Холодный воздух, объявления на русском, незнакомец предлагает «работу, регистрацию, всё». Начинается первый день.']] },
  intro_eaeu: { title: 'Казанский вокзал, 06:10', text: '{name}, гражданин страны ЕАЭС. Патент для работы не нужен, но регистрация и трудовой договор нужны всё равно. Москва больше всего, что вы видели дома ({home}).',
    choices: [['Выйти на перрон', 'Начинается первый день.']] },
  intro_student: { title: 'Из аэропорта в общежитие', text: '{name}, иностранный студент ({home}). Квотное место, общежитие и первые снежинки — всё по-настоящему. У студенческой визы и регистрации есть срок — следите за ним.',
    choices: [['Затащить чемодан наверх', 'Комендант выдаёт ключ и чайник. Начинается первый день.']] },
};
/** The home towns of the starting lives. */
export const HOME_RU: Record<string, string> = { 'Khatlon, Tajikistan': 'Хатлон, Таджикистан', 'Lagos, Nigeria': 'Лагос, Нигерия', Makhachkala: 'Махачкала', Moscow: 'Москва', 'Osh, Kyrgyzstan': 'Ош, Киргизия', 'Samarkand, Uzbekistan': 'Самарканд, Узбекистан', Saratov: 'Саратов' };
/** The scene categories shown over a scene. */
export const CAT_RU: Record<string, string> = { intro: 'Начало', work: 'Работа', papers: 'Документы', police: 'Полиция', money: 'Деньги', health: 'Здоровье', study: 'Учёба', love: 'Любовь', family: 'Семья',
  culture: 'Культура', history: 'История', traditions: 'Традиции', life: 'Жизнь', city: 'Город', home: 'Дом', food: 'Еда', travel: 'Поездки', weather: 'Погода', social: 'Друзья', business: 'Бизнес', arc: 'История героя', family_decision: 'Решение семьи' };
