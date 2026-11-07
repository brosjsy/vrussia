/* Sixty-two more achievements, each a few words of data and a small check on the player's state: milestones in days, money, earnings, friends, children,
   reputation, knowledge, scenes met (daily life, the 2026 rules, rights, dishes, proverbs, quizzes, festivals), places visited, banks, a clean record and the
   number of achievements. The Russian titles are in src/i18n-ach-more.ts (fetched only in Russian). */
import type { State } from './engine';

export type Spec =
  | { k: 'day'; n: number } | { k: 'money'; n: number } | { k: 'earned'; n: number } | { k: 'friends'; n: number } | { k: 'kids'; n: number }
  | { k: 'rep'; n: number } | { k: 'know'; n: number } | { k: 'seen'; p: string[]; n: number } | { k: 'places'; n: number } | { k: 'banks'; n: number }
  | { k: 'ach'; n: number } | { k: 'clean'; n: number };
export interface AchRow { id: string; icon: string; title: string; text: string; spec: Spec }

/** Does the player meet the specification? */
export function met(sp: Spec, s: State): boolean {
  switch (sp.k) {
    case 'day': return s.day >= sp.n;
    case 'money': return s.money >= sp.n;
    case 'earned': return s.earned >= sp.n;
    case 'friends': return s.friends >= sp.n;
    case 'kids': return s.kids >= sp.n;
    case 'rep': return s.rep >= sp.n;
    case 'know': return s.know >= sp.n;
    case 'seen': return Object.keys(s.seen).filter(k => sp.p.some(p => k.startsWith(p))).length >= sp.n;
    case 'places': return Object.values(s.known).filter(Boolean).length >= sp.n;
    case 'banks': return Object.values(s.bank).filter(Boolean).length >= sp.n;
    case 'ach': return s.ach.length >= sp.n;
    case 'clean': return s.day >= sp.n && s.strikes === 0;
  }
}

export const MORE_ROWS: AchRow[] = [
 {
  "id": "d30",
  "icon": "🗓️",
  "title": "One month",
  "text": "Survive thirty days.",
  "spec": {
   "k": "day",
   "n": 30
  }
 },
 {
  "id": "d60",
  "icon": "🍂",
  "title": "Two months",
  "text": "Survive sixty days.",
  "spec": {
   "k": "day",
   "n": 60
  }
 },
 {
  "id": "d100",
  "icon": "💯",
  "title": "A hundred days",
  "text": "Reach day 100.",
  "spec": {
   "k": "day",
   "n": 100
  }
 },
 {
  "id": "d150",
  "icon": "🌨️",
  "title": "The first snow behind you",
  "text": "Reach day 150.",
  "spec": {
   "k": "day",
   "n": 150
  }
 },
 {
  "id": "d270",
  "icon": "🌱",
  "title": "The first spring",
  "text": "Reach day 270.",
  "spec": {
   "k": "day",
   "n": 270
  }
 },
 {
  "id": "d365",
  "icon": "🎂",
  "title": "One year in Russia",
  "text": "Reach day 365.",
  "spec": {
   "k": "day",
   "n": 365
  }
 },
 {
  "id": "d450",
  "icon": "🍁",
  "title": "The second autumn",
  "text": "Reach day 450.",
  "spec": {
   "k": "day",
   "n": 450
  }
 },
 {
  "id": "d550",
  "icon": "⛄",
  "title": "The second winter",
  "text": "Reach day 550.",
  "spec": {
   "k": "day",
   "n": 550
  }
 },
 {
  "id": "d650",
  "icon": "🌞",
  "title": "Nearly two years",
  "text": "Reach day 650.",
  "spec": {
   "k": "day",
   "n": 650
  }
 },
 {
  "id": "m10",
  "icon": "💵",
  "title": "A first cushion",
  "text": "Hold ₽10,000.",
  "spec": {
   "k": "money",
   "n": 10000
  }
 },
 {
  "id": "m50",
  "icon": "💶",
  "title": "A month of safety",
  "text": "Hold ₽50,000.",
  "spec": {
   "k": "money",
   "n": 50000
  }
 },
 {
  "id": "m100",
  "icon": "💷",
  "title": "Six figures",
  "text": "Hold ₽100,000.",
  "spec": {
   "k": "money",
   "n": 100000
  }
 },
 {
  "id": "m250",
  "icon": "💰",
  "title": "A quarter of a million",
  "text": "Hold ₽250,000.",
  "spec": {
   "k": "money",
   "n": 250000
  }
 },
 {
  "id": "m500",
  "icon": "🏦",
  "title": "Half a million",
  "text": "Hold ₽500,000.",
  "spec": {
   "k": "money",
   "n": 500000
  }
 },
 {
  "id": "m2m",
  "icon": "💎",
  "title": "Two million",
  "text": "Hold ₽2,000,000.",
  "spec": {
   "k": "money",
   "n": 2000000
  }
 },
 {
  "id": "e50",
  "icon": "🧾",
  "title": "First wages",
  "text": "Earn ₽50,000 in total.",
  "spec": {
   "k": "earned",
   "n": 50000
  }
 },
 {
  "id": "e250",
  "icon": "🛠️",
  "title": "A working person",
  "text": "Earn ₽250,000 in total.",
  "spec": {
   "k": "earned",
   "n": 250000
  }
 },
 {
  "id": "e1m",
  "icon": "🏗️",
  "title": "A million earned",
  "text": "Earn ₽1,000,000 in total.",
  "spec": {
   "k": "earned",
   "n": 1000000
  }
 },
 {
  "id": "e3m",
  "icon": "🚀",
  "title": "Three million earned",
  "text": "Earn ₽3,000,000 in total.",
  "spec": {
   "k": "earned",
   "n": 3000000
  }
 },
 {
  "id": "f1",
  "icon": "🙂",
  "title": "A first friend",
  "text": "Make a friend.",
  "spec": {
   "k": "friends",
   "n": 1
  }
 },
 {
  "id": "f3",
  "icon": "👭",
  "title": "A small company",
  "text": "Make three friends.",
  "spec": {
   "k": "friends",
   "n": 3
  }
 },
 {
  "id": "f10",
  "icon": "🎈",
  "title": "A wide circle",
  "text": "Make ten friends.",
  "spec": {
   "k": "friends",
   "n": 10
  }
 },
 {
  "id": "f15",
  "icon": "🏘️",
  "title": "Everyone knows you",
  "text": "Make fifteen friends.",
  "spec": {
   "k": "friends",
   "n": 15
  }
 },
 {
  "id": "k2",
  "icon": "👨‍👩‍👧‍👦",
  "title": "A bigger family",
  "text": "Have two children.",
  "spec": {
   "k": "kids",
   "n": 2
  }
 },
 {
  "id": "k3",
  "icon": "🏡",
  "title": "A full house",
  "text": "Have three children.",
  "spec": {
   "k": "kids",
   "n": 3
  }
 },
 {
  "id": "r40",
  "icon": "🙋",
  "title": "Known in the yard",
  "text": "Reach reputation 40.",
  "spec": {
   "k": "rep",
   "n": 40
  }
 },
 {
  "id": "r60",
  "icon": "🤝",
  "title": "A respected neighbour",
  "text": "Reach reputation 60.",
  "spec": {
   "k": "rep",
   "n": 60
  }
 },
 {
  "id": "r80",
  "icon": "🌟",
  "title": "Everyone speaks well of you",
  "text": "Reach reputation 80.",
  "spec": {
   "k": "rep",
   "n": 80
  }
 },
 {
  "id": "r95",
  "icon": "👑",
  "title": "A pillar of the community",
  "text": "Reach reputation 95.",
  "spec": {
   "k": "rep",
   "n": 95
  }
 },
 {
  "id": "kn30",
  "icon": "📘",
  "title": "Getting the hang of it",
  "text": "Reach knowledge 30.",
  "spec": {
   "k": "know",
   "n": 30
  }
 },
 {
  "id": "kn50",
  "icon": "📗",
  "title": "Knows the ropes",
  "text": "Reach knowledge 50.",
  "spec": {
   "k": "know",
   "n": 50
  }
 },
 {
  "id": "kn70",
  "icon": "📕",
  "title": "An old hand",
  "text": "Reach knowledge 70.",
  "spec": {
   "k": "know",
   "n": 70
  }
 },
 {
  "id": "kn90",
  "icon": "🎩",
  "title": "A guide for newcomers",
  "text": "Reach knowledge 90.",
  "spec": {
   "k": "know",
   "n": 90
  }
 },
 {
  "id": "dl5",
  "icon": "☕",
  "title": "Little things",
  "text": "Meet 5 daily-life scenes.",
  "spec": {
   "k": "seen",
   "p": [
    "day-",
    "day2-",
    "day3-"
   ],
   "n": 5
  }
 },
 {
  "id": "dl15",
  "icon": "🥟",
  "title": "Everyday Russia",
  "text": "Meet 15 daily-life scenes.",
  "spec": {
   "k": "seen",
   "p": [
    "day-",
    "day2-",
    "day3-"
   ],
   "n": 15
  }
 },
 {
  "id": "dl30",
  "icon": "🧸",
  "title": "A local at heart",
  "text": "Meet 30 daily-life scenes.",
  "spec": {
   "k": "seen",
   "p": [
    "day-",
    "day2-",
    "day3-"
   ],
   "n": 30
  }
 },
 {
  "id": "dl50",
  "icon": "🏛️",
  "title": "Seen it all",
  "text": "Meet 50 daily-life scenes.",
  "spec": {
   "k": "seen",
   "p": [
    "day-",
    "day2-",
    "day3-"
   ],
   "n": 50
  }
 },
 {
  "id": "ru3",
  "icon": "📑",
  "title": "Reads the news",
  "text": "Meet 3 scenes about the 2026 rules.",
  "spec": {
   "k": "seen",
   "p": [
    "rule-"
   ],
   "n": 3
  }
 },
 {
  "id": "ru9",
  "icon": "⚖️",
  "title": "Knows the rules",
  "text": "Meet all 9 scenes about the 2026 rules.",
  "spec": {
   "k": "seen",
   "p": [
    "rule-"
   ],
   "n": 9
  }
 },
 {
  "id": "ri3",
  "icon": "🛡️",
  "title": "Knows some rights",
  "text": "Meet 3 scenes about your rights at a police check.",
  "spec": {
   "k": "seen",
   "p": [
    "right-"
   ],
   "n": 3
  }
 },
 {
  "id": "ri7",
  "icon": "📜",
  "title": "Cool under a check",
  "text": "Meet all 7 scenes about your rights.",
  "spec": {
   "k": "seen",
   "p": [
    "right-"
   ],
   "n": 7
  }
 },
 {
  "id": "pl4",
  "icon": "🧭",
  "title": "Getting around",
  "text": "Visit 4 places on the map.",
  "spec": {
   "k": "places",
   "n": 4
  }
 },
 {
  "id": "pl8",
  "icon": "🗺️",
  "title": "Half the map",
  "text": "Visit 8 places on the map.",
  "spec": {
   "k": "places",
   "n": 8
  }
 },
 {
  "id": "pl12",
  "icon": "🚏",
  "title": "Nearly everywhere",
  "text": "Visit 12 places on the map.",
  "spec": {
   "k": "places",
   "n": 12
  }
 },
 {
  "id": "bk2",
  "icon": "💳",
  "title": "Two banks",
  "text": "Open accounts in two banks.",
  "spec": {
   "k": "banks",
   "n": 2
  }
 },
 {
  "id": "bk3",
  "icon": "🏧",
  "title": "Three banks",
  "text": "Open accounts in three banks.",
  "spec": {
   "k": "banks",
   "n": 3
  }
 },
 {
  "id": "di10",
  "icon": "🥘",
  "title": "Ten dishes",
  "text": "Meet 10 different dishes.",
  "spec": {
   "k": "seen",
   "p": [
    "dish-"
   ],
   "n": 10
  }
 },
 {
  "id": "di50",
  "icon": "🍽️",
  "title": "A hundred tastes",
  "text": "Meet 50 different dishes.",
  "spec": {
   "k": "seen",
   "p": [
    "dish-"
   ],
   "n": 50
  }
 },
 {
  "id": "di100",
  "icon": "🥇",
  "title": "A cookbook in your head",
  "text": "Meet 100 different dishes.",
  "spec": {
   "k": "seen",
   "p": [
    "dish-"
   ],
   "n": 100
  }
 },
 {
  "id": "pv25",
  "icon": "✒️",
  "title": "A word for every occasion",
  "text": "Hear 25 Russian proverbs.",
  "spec": {
   "k": "seen",
   "p": [
    "prov-"
   ],
   "n": 25
  }
 },
 {
  "id": "pv50",
  "icon": "📖",
  "title": "A walking proverb book",
  "text": "Hear 50 Russian proverbs.",
  "spec": {
   "k": "seen",
   "p": [
    "prov-"
   ],
   "n": 50
  }
 },
 {
  "id": "qz50",
  "icon": "🧩",
  "title": "Quiz champion",
  "text": "Answer 50 culture questions.",
  "spec": {
   "k": "seen",
   "p": [
    "kq-",
    "quiz-"
   ],
   "n": 50
  }
 },
 {
  "id": "fs10",
  "icon": "🎊",
  "title": "A festival lover",
  "text": "Join 10 city festivals.",
  "spec": {
   "k": "seen",
   "p": [
    "cityfest-",
    "fest-"
   ],
   "n": 10
  }
 },
 {
  "id": "fs25",
  "icon": "🎆",
  "title": "Always at the party",
  "text": "Join 25 city festivals.",
  "spec": {
   "k": "seen",
   "p": [
    "cityfest-",
    "fest-"
   ],
   "n": 25
  }
 },
 {
  "id": "cl100",
  "icon": "🧼",
  "title": "A hundred clean days",
  "text": "Reach day 100 with no legal strikes.",
  "spec": {
   "k": "clean",
   "n": 100
  }
 },
 {
  "id": "cl250",
  "icon": "🧽",
  "title": "No trouble with the law",
  "text": "Reach day 250 with no legal strikes.",
  "spec": {
   "k": "clean",
   "n": 250
  }
 },
 {
  "id": "cl500",
  "icon": "🏆",
  "title": "Spotless",
  "text": "Reach day 500 with no legal strikes.",
  "spec": {
   "k": "clean",
   "n": 500
  }
 },
 {
  "id": "a10",
  "icon": "🥉",
  "title": "Ten achievements",
  "text": "Earn 10 achievements.",
  "spec": {
   "k": "ach",
   "n": 10
  }
 },
 {
  "id": "a25",
  "icon": "🥈",
  "title": "Twenty-five achievements",
  "text": "Earn 25 achievements.",
  "spec": {
   "k": "ach",
   "n": 25
  }
 },
 {
  "id": "a50",
  "icon": "🥇",
  "title": "Fifty achievements",
  "text": "Earn 50 achievements.",
  "spec": {
   "k": "ach",
   "n": 50
  }
 },
 {
  "id": "a75",
  "icon": "🏅",
  "title": "Seventy-five achievements",
  "text": "Earn 75 achievements.",
  "spec": {
   "k": "ach",
   "n": 75
  }
 },
 {
  "id": "a100",
  "icon": "🎖️",
  "title": "A hundred achievements",
  "text": "Earn 100 achievements.",
  "spec": {
   "k": "ach",
   "n": 100
  }
 }
] as AchRow[];
