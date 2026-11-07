-- Chapter 11: the year in Russia (round 158). Ten city-wide challenges for the holidays and seasons of the year; players of a city join and the server counts
-- how many have joined this week, the same as the other city challenges (migrations/0004, 0005). Data only: no new tables or functions. Run as vr_owner.

insert into app.chapters (id, title_en, title_ru, text_en, text_ru) values
 (11, 'The year in Russia', 'Год в России', 'A year here has a shape: the first snow, the long New Year break, pancakes in the cold, the ninth of May, the dacha, the harvest. Spend it together with your city.', 'У года здесь есть форма: первый снег, долгие новогодние каникулы, блины на морозе, девятое мая, дача, урожай. Проживите его вместе со своим городом.');
insert into app.challenges (id, chapter, sort, kind, event, target, weekly, reward, title_en, title_ru, text_en, text_ru) values
 ('first_snow', 11, 1, 'city', null, 20, false, 800, 'The first snow', 'Первый снег', 'Twenty players of your city go out to see the first snow.', 'Двадцать игроков вашего города выходят посмотреть на первый снег.'),
 ('unity_day', 11, 2, 'city', null, 30, false, 1000, 'Day of National Unity', 'День народного единства', 'Thirty players of your city come to the concert on 4 November.', 'Тридцать игроков вашего города приходят на концерт четвёртого ноября.'),
 ('new_year_feast', 11, 3, 'city', null, 60, false, 2000, 'The New Year table', 'Новогодний стол', 'Sixty players of your city set a New Year table for friends.', 'Шестьдесят игроков вашего города накрывают новогодний стол для друзей.'),
 ('defender_day', 11, 4, 'city', null, 25, false, 900, 'The twenty-third of February', 'Двадцать третье февраля', 'Twenty-five players of your city congratulate the men around them.', 'Двадцать пять игроков вашего города поздравляют окружающих мужчин.'),
 ('march_eight', 11, 5, 'city', null, 40, false, 1200, 'The eighth of March', 'Восьмое марта', 'Forty players of your city bring flowers to the women around them.', 'Сорок игроков вашего города дарят цветы женщинам вокруг.'),
 ('may_ninth', 11, 6, 'city', null, 50, false, 1500, 'The ninth of May', 'Девятое мая', 'Fifty players of your city take part in the march with photographs.', 'Пятьдесят игроков вашего города участвуют в шествии с фотографиями.'),
 ('russia_day', 11, 7, 'city', null, 40, false, 1200, 'Russia Day', 'День России', 'Forty players of your city join the round dance in the park.', 'Сорок игроков вашего города встают в хоровод в парке.'),
 ('dacha_weekend', 11, 8, 'city', null, 30, false, 1000, 'A weekend at the dacha', 'Выходные на даче', 'Thirty players of your city spend a weekend at a dacha.', 'Тридцать игроков вашего города проводят выходные на даче.'),
 ('mushroom_walk', 11, 9, 'city', null, 20, false, 800, 'The mushroom walk', 'Грибная прогулка', 'Twenty players of your city go to the forest for mushrooms.', 'Двадцать игроков вашего города идут в лес за грибами.'),
 ('first_of_september', 11, 10, 'city', null, 60, false, 1800, 'The first of September', 'Первое сентября', 'Sixty players of your city bring flowers to the first school bell.', 'Шестьдесят игроков вашего города несут цветы на первый звонок.');
