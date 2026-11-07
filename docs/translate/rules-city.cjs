// City guide scenes: templates with one city attribute (epithet, quirk, sight, food, event, employers, day trip, university) from attrs-ru.json.
const A = require('./attrs-ru.json');
const a = k => A[k];
module.exports = [
  [/^You step out in \{CITY\}, (.+)\.$/, m => a(m[1]) && `Вы выходите на улицу: {CITY} — ${a(m[1])}.`],
  [/^The first thing you notice: (.+)\.$/, m => a(m[1]) && `Первое, что бросается в глаза: ${a(m[1])}.`],
  [/^Walk toward (.+)$/, m => a(m[1]) && `Отправиться к достопримечательности: ${a(m[1])}`],
  [/^You follow the signs toward (.+) and lose track of time\.$/, m => a(m[1]) && `Вы идёте по указателям (${a(m[1])}) и теряете счёт времени.`],
  [/^The best-known sight of \{CITY\} is (.+)\.$/, m => a(m[1]) && `Самая известная достопримечательность {CITY:of}: ${a(m[1])}.`],
  [/^The guide tells stories about (.+?) that no signboard mentions\.$/, m => a(m[1]) && `Гид рассказывает истории о достопримечательности (${a(m[1])}), которых нет ни на одной табличке.`],
  [/^A local says you cannot know \{CITY\} until you try (.+)\.$/, m => a(m[1]) && `Местный говорит: {CITY:of} не узнать, пока не попробуешь: ${a(m[1])}.`],
  [/^You taste (.+)\.$/, m => a(m[1]) && `Вы пробуете: ${a(m[1])}.`],
  [/^The market in \{CITY\} sells ingredients for (.+), woollen socks, honey and everything in between\.$/, m => a(m[1]) && `На рынке {CITY:of} продают продукты для блюда (${a(m[1])}), шерстяные носки, мёд и всё, что между ними.`],
  [/^Everyday life in \{CITY\} comes with a quirk: (.+)\.$/, m => a(m[1]) && `Повседневная жизнь {CITY:of} с особенностью: ${a(m[1])}.`],
  [/^This season locals in \{CITY\} talk about one thing: (.+)\.$/, m => a(m[1]) && `В этот сезон местные {CITY:in} говорят об одном: ${a(m[1])}.`],
  [/^The biggest employers in \{CITY\} are in (.+)\.$/, m => a(m[1]) && `Крупнейшие работодатели {CITY:of} — в сферах: ${a(m[1])}.`],
  [/^At a bus stop in \{CITY\}, an old man tells you why the city is known as (.+)\.$/, m => a(m[1]) && `На остановке {CITY:in} старик рассказывает, почему город известен как: ${a(m[1])}.`],
  [/^day trip to (.+)$/, m => a(m[1]) && `поездка на день: ${a(m[1])}`],
  [/^A friend suggests a day trip to (.+)\.$/, m => a(m[1]) && `Друг предлагает поездку на день: ${a(m[1])}.`],
  [/^You return tired, tanned and rich in stories about (.+)\.$/, m => a(m[1]) && `Вы возвращаетесь усталым, загорелым и богатым на истории: ${a(m[1])}.`],
  [/^open day at (.+)$/, m => a(m[1]) && `день открытых дверей: ${a(m[1])}`],
  [/^Open day at (.+): stands, professors and free tea\.$/, m => a(m[1]) && `День открытых дверей: ${a(m[1])} — стенды, профессора и бесплатный чай.`],
  [/^(.+)$/, m => a(m[1])],
];
