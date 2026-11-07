/* The words of the platform screens (tour, privacy, learning report, classes, daily game, languages). English and Russian are complete; Uzbek, Tajik
   and Kyrgyz have the tour and the main labels, and everything else shows in Russian (see src/platform/locale.ts). Add a key to EN and RU together. */
import { currentLocale, fallsBackToRu } from './locale';

type Dict = Record<string, string>;
export const EN: Dict = {
  langUnreviewed: 'This language has not yet been checked by a native speaker. Some texts may be wrong; please tell us.', hub: 'More', hubTitle: 'Menu', hubLang: 'Language', hubPrivacy: 'Privacy and my data', hubTerms: 'Terms of use', hubTour: 'Replay the tutorial', hubSources: 'Sources for the rules',
  hubReport: 'My learning report', hubChecklist: 'My real-life checklist', hubClass: 'Class mode', hubDaily: 'Daily game', hubPack: 'Community scenario packs', hubA11y: 'Accessibility and performance',
  hubLite: 'Lite mode (no 3D, lighter on the phone)', hubContrast: 'High contrast', hubBigText: 'Text size',
  tourNext: 'Next', tourBack: 'Back', tourSkip: 'Skip', tourDone: 'Got it', tourOf: 'of',
  'tour.day.t': 'Your day', 'tour.day.b': 'Every day has three parts: morning, afternoon and evening. Each action uses one part. Two years = 730 days.',
  'tour.map.t': 'The city', 'tour.map.b': 'Click a place on the map to go there. Offices, shops, the clinic and your home are all different places with different things to do.',
  'tour.act.t': 'What to do', 'tour.act.b': 'Pick an action: work, eat, deal with papers, go out. Keys 1 to 9 choose, Enter continues.',
  'tour.meters.t': 'Your condition', 'tour.meters.b': 'Watch energy, health and stress. If health runs out the game can end in hospital, and money matters every Saturday when rent is due.',
  'tour.papers.t': 'Papers', 'tour.papers.b': 'Documents have deadlines. Expired papers bring fines and police checks; three strikes can mean deportation.',
  'tour.phone.t': 'The phone', 'tour.phone.b': 'Online services, the bank, chats and the metro are in your phone.',
  'tour.settings.t': 'Settings', 'tour.settings.b': 'Text size, colour-blind colours, less motion and graphics are here. The game saves by itself. You can replay this tour in the More menu.',
  cbTitle: 'Your privacy', cbBody: 'The game works without sending anything. May it send anonymous usage numbers and error reports (no name, e-mail or IP address) to help us improve it?', cbYes: 'Yes, allow', cbNo: 'No, thanks', cbMore: 'Read the policy',
  myData: 'My data', dlLocal: 'Download what this device keeps', eraseLocal: 'Erase everything on this device', eraseSure: 'Erase the saved game, settings and results on this device? This cannot be undone.', erased: 'Erased',
  dlServer: 'Download my account data', deleteAcc: 'Delete my account (in Online)', analyticsOn: 'Allow anonymous usage numbers and error reports', analyticsNote: 'Nothing is sent unless this is on.',
  repTitle: 'What you learned', repNone: 'Play for a while first: the report fills in as you go.', repDone: 'Done well', repMistakes: 'Mistakes to avoid', repNext: 'Do this in real life', repSources: 'Check these sources', repPrint: 'Print or save as PDF', repCard: 'Save a result card',
  srcTitle: 'Sources for the rules', srcNever: 'Not yet checked by a person', srcChecked: 'Last checked', srcOld: 'Check again: old', srcNote: 'The game simplifies the rules. Before acting in real life, check the official source.', srcOpen: 'Official site',
  classTitle: 'Class mode', classJoin: 'Enter a class code', classCode: 'Class code', classJoinBtn: 'Join', classNick: 'Nickname (not your real name)', classIn: 'You are in class', classLeave: 'Leave the class', classBad: 'No class with that code.', classSent: 'Your result was sent to your teacher.',
  classTeacher: 'I am a teacher or an NGO', classNew: 'Create a class', className: 'Class name', classNote: 'Task for the class (optional)', classMade: 'Class created. Give this code to your pupils:', classLogin: 'Log in under Online to create a class.', classNoResults: 'No results yet.',
  classPupils: 'Results', classAssign: 'Task', classRefresh: 'Refresh',
  dailyTitle: 'Daily game', dailyToday: 'Today', dailyPlay: 'Play today’s game', dailyStreak: 'Streak', dailySeason: 'Season', dailyBest: 'Best today',
  packTitle: 'Community scenario packs', packBody: 'A pack is a JSON file with extra scenarios. It is checked before it is used and runs only on this device.', packChoose: 'Choose a pack file', packOk: 'Pack loaded', packBad: 'Problems in the pack', packLoaded: 'Loaded packs', packRemove: 'Remove', packTemplate: 'Download a template',
  cardTitle: 'Result card', cardSave: 'Save the card (PNG)', langNote: 'Languages other than English and Russian have not been reviewed by native speakers yet. The menus and the tutorial are translated; story texts show in Russian or English.',
  liteNote: 'Lite mode turns the 3D world off and keeps the flat map.', close: 'Close',
  hubSound: 'Sound and music', sndSfx: 'Sound effects', sndSfxVol: 'Effects volume', sndMusic: 'Music and ambience', sndMusicVol: 'Music volume', sndNote: 'Music follows what you are doing and starts only after your first click. Each volume works on its own, apart from your device volume.',
  nextLabel: 'Next', nextDays: 'days left', nextWhy: 'Why?', winFirst: 'Your first win', winDone: 'Done', hintTitle: 'Tip',
  hubGuide: 'Ask the guide', guideTitle: 'Ask the guide', guideAsk: 'Ask', guidePh: 'For example: how long do I have to register?', guideNone: 'I do not have a vetted answer to that. Try one of these topics, or check the official sources.', guideTopics: 'Topics', guideFrom: 'Answer from the game’s vetted notes', guideSure: 'This is not legal advice. Rules change: check the official source.', guideRelated: 'Related',
  hubPersonal: 'Adaptive scenarios', personalOn: 'Adapt the scenarios to me (learns on this device only)', personalNote: 'The game shows a little more of what helps you and your papers, and a little less of what keeps going badly. The law and police rules are never changed.',
};
export const RU: Dict = {
  langUnreviewed: 'Этот язык ещё не проверен носителем. Возможны ошибки в текстах; пожалуйста, сообщите нам.', hub: 'Ещё', hubTitle: 'Меню', hubLang: 'Язык', hubPrivacy: 'Конфиденциальность и мои данные', hubTerms: 'Условия использования', hubTour: 'Пройти обучение заново', hubSources: 'Источники правил',
  hubReport: 'Мой отчёт об обучении', hubChecklist: 'Мой чек-лист на жизнь', hubClass: 'Режим класса', hubDaily: 'Игра дня', hubPack: 'Пакеты сценариев от сообщества', hubA11y: 'Доступность и скорость',
  hubLite: 'Лёгкий режим (без 3D, для слабых телефонов)', hubContrast: 'Высокая контрастность', hubBigText: 'Размер текста',
  tourNext: 'Дальше', tourBack: 'Назад', tourSkip: 'Пропустить', tourDone: 'Понятно', tourOf: 'из',
  'tour.day.t': 'Ваш день', 'tour.day.b': 'В каждом дне три части: утро, день и вечер. Каждое действие занимает одну часть. Два года — это 730 дней.',
  'tour.map.t': 'Город', 'tour.map.b': 'Нажмите на место на карте, чтобы пойти туда. Офисы, магазины, поликлиника и ваш дом — разные места с разными делами.',
  'tour.act.t': 'Что делать', 'tour.act.b': 'Выберите действие: работа, еда, бумаги, выход в город. Клавиши 1–9 выбирают, Enter продолжает.',
  'tour.meters.t': 'Ваше состояние', 'tour.meters.b': 'Следите за энергией, здоровьем и стрессом. Если здоровье кончится, игра может закончиться больницей, а по субботам нужно платить за жильё.',
  'tour.papers.t': 'Документы', 'tour.papers.b': 'У документов есть сроки. Просроченные бумаги ведут к штрафам и проверкам полиции; три предупреждения могут закончиться депортацией.',
  'tour.phone.t': 'Телефон', 'tour.phone.b': 'Онлайн-сервисы, банк, чаты и метро — в вашем телефоне.',
  'tour.settings.t': 'Настройки', 'tour.settings.b': 'Размер текста, цвета для дальтоников, меньше движения и графика — здесь. Игра сохраняется сама. Обучение можно пройти снова в меню «Ещё».',
  cbTitle: 'Ваша конфиденциальность', cbBody: 'Игра работает и без отправки данных. Разрешить отправлять анонимную статистику и отчёты об ошибках (без имени, почты и IP-адреса), чтобы мы могли улучшать игру?', cbYes: 'Да, разрешить', cbNo: 'Нет, спасибо', cbMore: 'Прочитать политику',
  myData: 'Мои данные', dlLocal: 'Скачать то, что хранит это устройство', eraseLocal: 'Стереть всё на этом устройстве', eraseSure: 'Стереть сохранённую игру, настройки и результаты на этом устройстве? Это нельзя отменить.', erased: 'Стёрто',
  dlServer: 'Скачать данные моего аккаунта', deleteAcc: 'Удалить аккаунт (в разделе «Онлайн»)', analyticsOn: 'Разрешить анонимную статистику и отчёты об ошибках', analyticsNote: 'Пока выключено, ничего не отправляется.',
  repTitle: 'Чему вы научились', repNone: 'Поиграйте немного: отчёт наполняется по ходу игры.', repDone: 'Сделано хорошо', repMistakes: 'Ошибки, которых стоит избегать', repNext: 'Сделайте в реальной жизни', repSources: 'Проверьте источники', repPrint: 'Печать или сохранить в PDF', repCard: 'Сохранить карточку',
  srcTitle: 'Источники правил', srcNever: 'Человек ещё не проверял', srcChecked: 'Проверено', srcOld: 'Проверьте снова: давно', srcNote: 'Игра упрощает правила. Прежде чем действовать в жизни, проверьте официальный источник.', srcOpen: 'Официальный сайт',
  classTitle: 'Режим класса', classJoin: 'Введите код класса', classCode: 'Код класса', classJoinBtn: 'Войти', classNick: 'Псевдоним (не настоящее имя)', classIn: 'Вы в классе', classLeave: 'Выйти из класса', classBad: 'Класса с таким кодом нет.', classSent: 'Ваш результат отправлен учителю.',
  classTeacher: 'Я учитель или НКО', classNew: 'Создать класс', className: 'Название класса', classNote: 'Задание классу (необязательно)', classMade: 'Класс создан. Дайте этот код ученикам:', classLogin: 'Войдите в раздел «Онлайн», чтобы создать класс.', classNoResults: 'Результатов пока нет.',
  classPupils: 'Результаты', classAssign: 'Задание', classRefresh: 'Обновить',
  dailyTitle: 'Игра дня', dailyToday: 'Сегодня', dailyPlay: 'Играть в игру дня', dailyStreak: 'Серия', dailySeason: 'Сезон', dailyBest: 'Лучший результат сегодня',
  packTitle: 'Пакеты сценариев от сообщества', packBody: 'Пакет — это JSON-файл с дополнительными сценариями. Он проверяется перед использованием и работает только на этом устройстве.', packChoose: 'Выберите файл пакета', packOk: 'Пакет загружен', packBad: 'Проблемы в пакете', packLoaded: 'Загруженные пакеты', packRemove: 'Убрать', packTemplate: 'Скачать шаблон',
  cardTitle: 'Карточка результата', cardSave: 'Сохранить карточку (PNG)', langNote: 'Тексты на языках, кроме английского и русского, ещё не проверены носителями. Меню и обучение переведены; тексты сюжета показываются по-русски или по-английски.',
  liteNote: 'Лёгкий режим выключает 3D-мир и оставляет плоскую карту.', close: 'Закрыть',
  hubSound: 'Звук и музыка', sndSfx: 'Звуковые эффекты', sndSfxVol: 'Громкость эффектов', sndMusic: 'Музыка и фон', sndMusicVol: 'Громкость музыки', sndNote: 'Музыка подстраивается под то, чем вы заняты, и включается только после первого клика. Каждая громкость работает отдельно от громкости устройства.',
  nextLabel: 'Дальше', nextDays: 'дн. осталось', nextWhy: 'Почему?', winFirst: 'Ваша первая победа', winDone: 'Готово', hintTitle: 'Совет',
  hubGuide: 'Спросить гида', guideTitle: 'Спросить гида', guideAsk: 'Спросить', guidePh: 'Например: сколько времени есть на учёт?', guideNone: 'Проверенного ответа на это у меня нет. Попробуйте одну из тем или загляните в официальные источники.', guideTopics: 'Темы', guideFrom: 'Ответ из проверенных заметок игры', guideSure: 'Это не юридическая консультация. Правила меняются: проверяйте официальный источник.', guideRelated: 'Похожее',
  hubPersonal: 'Подстройка сценариев', personalOn: 'Подстраивать сценарии под меня (учится только на этом устройстве)', personalNote: 'Игра показывает чуть больше того, что вам помогает, и ваших документов, и чуть меньше того, что всё время идёт плохо. Правила закона и полиции не меняются.',
};
export const UZ: Dict = {
  hub: 'Yana', hubTitle: 'Menyu', hubLang: 'Til', hubPrivacy: 'Maxfiylik va maʼlumotlarim', hubTour: 'Oʻrgatishni qayta koʻrish', hubReport: 'Oʻrganganlarim hisoboti', hubChecklist: 'Hayot uchun roʻyxatim',
  tourNext: 'Keyingi', tourBack: 'Orqaga', tourSkip: 'Oʻtkazib yuborish', tourDone: 'Tushunarli', tourOf: '/',
  'tour.day.t': 'Kuningiz', 'tour.day.b': 'Har kun uch qismdan iborat: ertalab, tushdan keyin va kechqurun. Har bir ish bir qismni oladi. Ikki yil — 730 kun.',
  'tour.map.t': 'Shahar', 'tour.map.b': 'Borish uchun xaritadagi joyni bosing. Idoralar, doʻkonlar, poliklinika va uyingiz — hammasi har xil joy.',
  'tour.act.t': 'Nima qilish kerak', 'tour.act.b': 'Ishni tanlang: ish, ovqat, hujjatlar, shaharga chiqish. 1–9 tugmalari tanlaydi, Enter davom ettiradi.',
  'tour.meters.t': 'Ahvolingiz', 'tour.meters.b': 'Energiya, salomatlik va stressni kuzating. Salomatlik tugasa, oʻyin shifoxonada tugashi mumkin. Shanba kunlari ijara toʻlanadi.',
  'tour.papers.t': 'Hujjatlar', 'tour.papers.b': 'Hujjatlarning muddati bor. Muddati oʻtgan hujjat jarima va tekshiruvga olib keladi; uchta ogohlantirish deportatsiyaga sabab boʻlishi mumkin.',
  'tour.phone.t': 'Telefon', 'tour.phone.b': 'Onlayn xizmatlar, bank, chatlar va metro telefoningizda.',
  'tour.settings.t': 'Sozlamalar', 'tour.settings.b': 'Matn oʻlchami, ranglar, harakat va grafika shu yerda. Oʻyin oʻzi saqlanadi. Oʻrgatishni “Yana” menyusida qayta koʻrish mumkin.',
  cbTitle: 'Maxfiyligingiz', cbYes: 'Ha, ruxsat beraman', cbNo: 'Yoʻq, rahmat',
};
export const TG: Dict = {
  hub: 'Боз', hubTitle: 'Меню', hubLang: 'Забон', hubPrivacy: 'Махфият ва маълумоти ман', hubTour: 'Омӯзишро аз нав дидан', hubReport: 'Ҳисоботи омӯхтаҳои ман', hubChecklist: 'Рӯйхати ман барои ҳаёт',
  tourNext: 'Минбаъд', tourBack: 'Ба қафо', tourSkip: 'Гузаштан', tourDone: 'Фаҳмо', tourOf: 'аз',
  'tour.day.t': 'Рӯзи шумо', 'tour.day.b': 'Ҳар рӯз се қисм дорад: субҳ, нимарӯз ва бегоҳ. Ҳар амал як қисмро мегирад. Ду сол — 730 рӯз.',
  'tour.map.t': 'Шаҳр', 'tour.map.b': 'Барои рафтан ба ҷои дилхоҳ дар харита пахш кунед. Идораҳо, мағозаҳо, поликлиника ва хонаи шумо — ҷойҳои гуногунанд.',
  'tour.act.t': 'Чӣ кор кардан', 'tour.act.b': 'Амалро интихоб кунед: кор, хӯрок, ҳуҷҷатҳо, баромадан ба шаҳр. Тугмаҳои 1–9 интихоб мекунанд, Enter идома медиҳад.',
  'tour.meters.t': 'Ҳолати шумо', 'tour.meters.b': 'Ба энергия, саломатӣ ва стресс назар кунед. Агар саломатӣ тамом шавад, бозӣ метавонад дар беморхона анҷом ёбад. Рӯзи шанбе иҷора месупорем.',
  'tour.papers.t': 'Ҳуҷҷатҳо', 'tour.papers.b': 'Ҳуҷҷатҳо мӯҳлат доранд. Ҳуҷҷати мӯҳлаташ гузашта ҷарима ва санҷиши полисро меорад; се огоҳӣ метавонад ба ихроҷ расонад.',
  'tour.phone.t': 'Телефон', 'tour.phone.b': 'Хидматҳои онлайн, бонк, чатҳо ва метро дар телефони шумост.',
  'tour.settings.t': 'Танзимот', 'tour.settings.b': 'Андозаи матн, рангҳо, ҳаракат ва графика дар ин ҷост. Бозӣ худаш захира мешавад. Омӯзишро дар менюи «Боз» аз нав дидан мумкин аст.',
  cbTitle: 'Махфияти шумо', cbYes: 'Бале, иҷозат медиҳам', cbNo: 'Не, раҳмат',
};
export const KY: Dict = {
  hub: 'Дагы', hubTitle: 'Меню', hubLang: 'Тил', hubPrivacy: 'Купуялуулук жана маалыматтарым', hubTour: 'Үйрөнүүнү кайра көрүү', hubReport: 'Үйрөнгөндөрүмдүн отчету', hubChecklist: 'Жашоо үчүн тизмем',
  tourNext: 'Кийинки', tourBack: 'Артка', tourSkip: 'Өткөрүп жиберүү', tourDone: 'Түшүнүктүү', tourOf: '/',
  'tour.day.t': 'Күнүңүз', 'tour.day.b': 'Ар бир күн үч бөлүктөн турат: эртең менен, түштөн кийин жана кечинде. Ар бир иш бир бөлүктү алат. Эки жыл — 730 күн.',
  'tour.map.t': 'Шаар', 'tour.map.b': 'Барыш үчүн картадагы жерди басыңыз. Мекемелер, дүкөндөр, поликлиника жана үйүңүз — баары ар түрдүү жер.',
  'tour.act.t': 'Эмне кылуу керек', 'tour.act.b': 'Ишти тандаңыз: жумуш, тамак, документтер, шаарга чыгуу. 1–9 баскычтары тандайт, Enter улантат.',
  'tour.meters.t': 'Абалыңыз', 'tour.meters.b': 'Энергияны, ден соолукту жана стрессти карап туруңуз. Ден соолук түгөнсө, оюн ооруканада бүтүшү мүмкүн. Ишемби күнү батир акысы төлөнөт.',
  'tour.papers.t': 'Документтер', 'tour.papers.b': 'Документтердин мөөнөтү бар. Мөөнөтү өткөн документ айып жана текшерүүгө алып келет; үч эскертүү депортацияга себеп болушу мүмкүн.',
  'tour.phone.t': 'Телефон', 'tour.phone.b': 'Онлайн кызматтар, банк, чаттар жана метро телефонуңузда.',
  'tour.settings.t': 'Жөндөөлөр', 'tour.settings.b': 'Тексттин өлчөмү, түстөр, кыймыл жана графика ушул жерде. Оюн өзү сакталат. Үйрөнүүнү «Дагы» менюсунан кайра көрсө болот.',
  cbTitle: 'Купуялуулугуңуз', cbYes: 'Ооба, уруксат берем', cbNo: 'Жок, рахмат',
};
const DICTS: Record<string, Dict> = { en: EN, ru: RU, uz: UZ, tg: TG, ky: KY };
/** Adds the platform texts of the languages that load later (locale-more.ts). */
export function usePfDicts(d: Record<string, Dict>): void { Object.assign(DICTS, d); }

/** A platform text in the current language, falling back to Russian (for uz, tg, ky), then English, then the key. */
export function pf(key: string): string {
  const l = currentLocale();
  return DICTS[l]?.[key] ?? (l === 'en' || !fallsBackToRu(l) ? undefined : RU[key]) ?? EN[key] ?? key;
}
