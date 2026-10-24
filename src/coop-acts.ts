/* What each co-op challenge asks each friend to do in their own game (round 150): "I did my part" counts only when the player has done this City life
   activity (lifeacts.ts) since the challenge was accepted; if not, the button does it now, with its price, energy and time. Found in manual testing:
   the tea challenge could be finished by pressing the button alone. */
export const COOP_ACT: Record<string, { act: string; en: string; ru: string }> = {
  tea_together: { act: 'teafriends', en: 'tea in the kitchen', ru: 'чай на кухне' },
  cinema_together: { act: 'cinema', en: 'go to the cinema', ru: 'сходить в кино' },
  housewarming: { act: 'housewarming', en: 'a housewarming party', ru: 'новоселье' },
  help_move: { act: 'moving', en: 'help a friend move', ru: 'помочь с переездом' },
  market_together: { act: 'marketfood', en: 'haggle at the market', ru: 'поторговаться на рынке' },
  language_swap: { act: 'languageclub', en: 'a language exchange', ru: 'языковой обмен' },
  homework_together: { act: 'groupstudy', en: 'study together', ru: 'учёба вместе' },
  pelmeni_night: { act: 'pelmeni', en: 'make pelmeni', ru: 'лепить пельмени' },
  rink_together: { act: 'skating', en: 'skate at the rink', ru: 'покататься на катке' },
  banya_together: { act: 'banya', en: 'go to the banya', ru: 'сходить в баню' },
  new_year_table: { act: 'newyear', en: 'the New Year table', ru: 'новогодний стол' },
  show_the_city: { act: 'citytour', en: 'a walk round the city', ru: 'прогулка по городу' },
  train_together: { act: 'trainplatz', en: 'a train trip', ru: 'поездка на поезде' },
};
