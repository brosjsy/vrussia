/* Working for the state: the police (patrol, traffic, the district officer), the migration department, the tax service, customs, the fire and rescue
   service, the bailiffs, and the state's own institutions and companies (the MFC, Russian Railways, Russian Post). A vacancy is found on the board
   (like the job sites and the state's own job portal), applied for, and won through an interview and the checks (for the police and the other services
   with ranks: a medical commission, a fitness test, a background check, and the oath). Then every working day is lived through: leaving home at a chosen
   time, getting there (metro, bus, on foot, by car with the staff car park or paid street parking, or a taxi), the checkpoint, the cases of the day
   (decisions: the lawful way, the easy way, or a bribe), lunch with colleagues, and leaving on time, staying late or slipping away early. Merit raises
   the rank; reprimands and being caught taking money end the career.
   Service in the police and in the state civil service is for Russian citizens only (Federal Laws 342-FZ and 79-FZ); every salary, rank step and
   case is a simplified game value. A working day takes the game's morning and afternoon (the clock moves on as with any action). Opt-in, so the balance bots never use it. Pure and deterministic: no screen. */
import type { State } from './engine';
import { advance } from './engine';

export type RoleId = 'pps' | 'dps' | 'uch' | 'guvm' | 'fns' | 'customs' | 'mchs' | 'fssp' | 'mfc' | 'rzd' | 'post';
export interface Opt { t: string; ok: boolean; bribe?: number; merit: number; rep?: number; stress?: number; out: string }
export interface Case { id: string; title: string; text: string; opts: Opt[] }
export interface Role {
  id: RoleId; name: string; ru: string; org: string; orgRu: string; icon: string; kind: 'service' | 'state';
  base: number; energy: number; stress: number; cit: boolean; know: number; fit: boolean; start: number; end: number;
  ranks: string[]; ranksRu: string[]; office: string; cases: Case[];
}
const O = (t: string, ok: boolean, merit: number, out: string, x: Partial<Opt> = {}): Opt => ({ t, ok, merit, out, ...x });
const POLICE_RANKS = ['Private of police', 'Junior sergeant', 'Sergeant', 'Senior sergeant', 'Lieutenant'];
const POLICE_RANKS_RU = ['Рядовой полиции', 'Младший сержант', 'Сержант', 'Старший сержант', 'Лейтенант'];
const CIVIL_RANKS = ['Specialist', 'Senior specialist', 'Lead specialist', 'Chief specialist', 'Deputy head of department'];
const CIVIL_RANKS_RU = ['Специалист', 'Старший специалист', 'Ведущий специалист', 'Главный специалист', 'Заместитель начальника отдела'];
const H = 60;                                                       // minutes in an hour, for the times of day

export const ROLES: Role[] = [
  { id: 'pps', name: 'Patrol police officer', ru: 'Полицейский патрульно-постовой службы', org: 'Police (Ministry of Internal Affairs)', orgRu: 'Полиция (МВД)', icon: '👮', kind: 'service',
    base: 3400, energy: 28, stress: 8, cit: true, know: 25, fit: true, start: 8 * H, end: 20 * H, ranks: POLICE_RANKS, ranksRu: POLICE_RANKS_RU, office: 'the district police department',
    cases: [
      { id: 'pps1', title: 'A lost child in the metro', text: 'A girl of about six is crying by the turnstiles. She says her mother "went on the train".', opts: [
        O('Stay with her, call the station duty officer and announce it', true, 3, 'Her mother comes back on the next train, in tears. The station thanks your unit.', { rep: 2 }),
        O('Take her to the police room and write it up', true, 2, 'Correct, slower. The mother finds her there an hour later.'),
        O('Tell her to wait where she is', false, -3, 'A passer-by complains about you to the duty officer.', { stress: 4 })] },
      { id: 'pps2', title: 'A man asleep on a bench in the frost', text: 'Minus eighteen. A man in a thin jacket is asleep on a bench, smelling of drink.', opts: [
        O('Wake him, call an ambulance if he cannot stand', true, 3, 'The paramedics say another hour would have cost him his toes.', { rep: 2 }),
        O('Leave him: he will wake up', false, -4, 'He is found in the morning with frostbite. There is an inquiry.', { stress: 8 })] },
      { id: 'pps3', title: 'A document check at the market', text: 'Your partner wants to check every migrant at the market "for the numbers".', opts: [
        O('Check only with a reason, as the law says, and politely', true, 3, 'Two checks, both in order. A trader brings you tea later.', { rep: 1 }),
        O('Check everyone, quickly and rudely', false, -2, 'A complaint is filed with the prosecutor. Your name is on it.', { stress: 5 }),
        O('Hint that a "small fee" makes a missing paper go away', false, 0, 'A crumpled 2,000 roubles in your pocket.', { bribe: 2000 })] },
      { id: 'pps4', title: 'A fight outside a bar', text: 'Two men are fighting; a third is filming on his phone.', opts: [
        O('Separate them with your partner and call for a car', true, 3, 'Both are taken in for a statement. Nobody badly hurt.'),
        O('Wait until it ends by itself', false, -3, 'One ends up in hospital. The video is online with you in it.', { stress: 6 })] },
      { id: 'pps5', title: 'A tourist asks the way', text: 'A couple with a map ask for the Tretyakov Gallery, in English.', opts: [
        O('Explain, in the English you have', true, 1, 'They take a photo with you. Good for the city.', { rep: 2 }),
        O('Shrug', false, 0, 'They go the wrong way.')] },
    ] },
  { id: 'dps', name: 'Traffic police inspector', ru: 'Инспектор ДПС ГИБДД', org: 'Traffic police (GIBDD)', orgRu: 'ГИБДД', icon: '🚓', kind: 'service',
    base: 3800, energy: 26, stress: 8, cit: true, know: 30, fit: true, start: 8 * H, end: 20 * H, ranks: POLICE_RANKS, ranksRu: POLICE_RANKS_RU, office: 'the traffic police battalion',
    cases: [
      { id: 'dps1', title: 'Forty over the limit', text: 'You stop a car at 100 km/h in a 60 zone. The driver holds out his licence with 5,000 roubles inside.', opts: [
        O('Give back the money and write the fine', true, 3, 'He pays the fine at half price in the first 20 days. Your dashcam saw it all.'),
        O('Take it', false, 0, '5,000 roubles. The body camera was on.', { bribe: 5000 })] },
      { id: 'dps2', title: 'A small accident, nobody hurt', text: 'Two cars touched at a light. Both drivers agree who is at fault.', opts: [
        O('Explain the European protocol: they fill it in themselves', true, 2, 'Ten minutes, and the road is clear.', { rep: 1 }),
        O('Make them wait two hours for a full report', false, -1, 'A traffic jam to the horizon.', { stress: 3 })] },
      { id: 'dps3', title: 'A driver who has been drinking', text: 'The breath test shows 0.6 mg per litre.', opts: [
        O('Take him off the road, the car to the pound, the case to court', true, 4, 'Right by the book. He may lose his licence for two years.'),
        O('Let him call someone to drive and go', false, -2, 'Half a kilometre later he hits a fence.', { stress: 6 })] },
      { id: 'dps4', title: 'An ambulance in a jam', text: 'An ambulance with lights on is stuck behind a line of cars.', opts: [
        O('Clear the lane with your car and the loudspeaker', true, 3, 'It gets through. The crew raise a hand.', { rep: 2 }),
        O('Not your job', false, -2, 'The video of your parked car goes round the city chats.')] },
      { id: 'dps5', title: 'Parked on the crossing', text: 'A black SUV is parked on a pedestrian crossing. The driver says he "knows people".', opts: [
        O('Fine him like anyone else', true, 3, 'He calls someone. Nothing happens. The fine stands.'),
        O('Let it go', false, -1, 'A mother with a pram has to go round it into the road.')] },
    ] },
  { id: 'uch', name: 'District police officer', ru: 'Участковый уполномоченный полиции', org: 'Police (Ministry of Internal Affairs)', orgRu: 'Полиция (МВД)', icon: '🏘️', kind: 'service',
    base: 3600, energy: 22, stress: 8, cit: true, know: 35, fit: true, start: 9 * H, end: 18 * H, ranks: POLICE_RANKS, ranksRu: POLICE_RANKS_RU, office: 'the district officer\'s point in a block of flats',
    cases: [
      { id: 'uch1', title: 'Noise after eleven', text: 'The third complaint this month about music on the fifth floor.', opts: [
        O('Visit, explain the regional law on silence, write a warning', true, 2, 'The music stops. The neighbours sleep.'),
        O('Ignore the complaint', false, -2, 'The neighbours write to the head of the department.')] },
      { id: 'uch2', title: 'A pensioner and a phone scam', text: 'An old woman gave 80,000 roubles to "the bank\'s security service" on the phone.', opts: [
        O('Take a full statement, send it to investigators, warn the building', true, 3, 'Notices in every entrance. Two neighbours hang up on the same callers that week.', { rep: 2 }),
        O('Say nothing can be done', false, -2, 'Her son complains. He is right.')] },
      { id: 'uch3', title: 'Thirty people registered in one flat', text: 'A one-room flat has thirty people registered in it. Nobody lives there.', opts: [
        O('Report the fictitious registration to the migration department', true, 3, 'The owner faces a case; the registrations are cancelled.'),
        O('The owner offers you "a share" to forget it', false, 0, '10,000 roubles. And thirty people with papers that are not worth anything.', { bribe: 10000 })] },
      { id: 'uch4', title: 'A quarrel in a family', text: 'Neighbours heard shouting and something breaking.', opts: [
        O('Go at once, talk to each of them alone, give the help line', true, 3, 'Nobody hurt. The woman keeps the card with the number.'),
        O('"Family matters" — do not go', false, -3, 'The next call is worse.', { stress: 6 })] },
      { id: 'uch5', title: 'The yearly round of the district', text: 'Your plan: visit every block, meet the elders and the shopkeepers.', opts: [
        O('Walk it all, write down the problems', true, 2, 'A broken lamp, a dangerous yard, a lonely veteran. Now you know.', { rep: 2 }),
        O('Fill in the report from your desk', false, -1, 'The report is neat. The district is not.')] },
    ] },
  { id: 'guvm', name: 'Migration officer', ru: 'Инспектор по вопросам миграции', org: 'Migration department (GUVM of the MVD)', orgRu: 'ГУВМ МВД', icon: '🛂', kind: 'service',
    base: 3000, energy: 18, stress: 7, cit: true, know: 40, fit: false, start: 9 * H, end: 18 * H, ranks: POLICE_RANKS, ranksRu: POLICE_RANKS_RU, office: 'the migration department',
    cases: [
      { id: 'guvm1', title: 'A patent without the medical certificate', text: 'A worker has everything for the patent except the medical certificate.', opts: [
        O('Explain where to get it and the deadline; take nothing yet', true, 2, 'He comes back in three days with it. Done.'),
        O('Accept it anyway', false, -3, 'An audit finds it. A reprimand.', { stress: 4 }),
        O('"Help" for a fee', false, 0, '3,000 roubles in an envelope.', { bribe: 3000 })] },
      { id: 'guvm2', title: 'A registration that is late', text: 'A student is two days late with the notice of arrival because the dorm forgot.', opts: [
        O('Take the notice, explain the fine is the host\'s responsibility', true, 2, 'The university pays; the student is legal.'),
        O('Refuse and threaten expulsion', false, -2, 'The university\'s lawyer calls your boss.')] },
      { id: 'guvm3', title: 'The Russian language test', text: 'A candidate for a residence permit clearly cannot read the questions.', opts: [
        O('Follow the rules: the test is failed, it can be taken again', true, 2, 'He thanks you anyway and goes to a course.'),
        O('Mark it passed out of pity', false, -2, 'The next check of your desk finds it.')] },
      { id: 'guvm4', title: 'A long queue and a broken printer', text: 'Fifty people, one printer, and it jams.', opts: [
        O('Call the IT desk, meanwhile check documents by hand', true, 2, 'The queue moves. Nobody shouts.', { rep: 1 }),
        O('Close the window "for technical reasons"', false, -1, 'Fifty people come back tomorrow, angrier.')] },
      { id: 'guvm5', title: 'A quota for temporary residence', text: 'One place left in the quota; two applications are complete.', opts: [
        O('Give it to the first complete application by the date', true, 2, 'Fair and written down.'),
        O('Give it to the one a colleague asked you about', false, -2, 'The other applicant appeals, and wins.')] },
    ] },
  { id: 'fns', name: 'Tax inspector', ru: 'Государственный налоговый инспектор', org: 'Federal Tax Service (FNS)', orgRu: 'ФНС России', icon: '🧾', kind: 'service',
    base: 3200, energy: 16, stress: 6, cit: true, know: 45, fit: false, start: 9 * H, end: 18 * H, ranks: CIVIL_RANKS, ranksRu: CIVIL_RANKS_RU, office: 'the district tax inspectorate',
    cases: [
      { id: 'fns1', title: 'A new self-employed', text: 'A young woman bakes cakes and wants to do it legally.', opts: [
        O('Show her the "My Tax" app: 4% from people, 6% from companies', true, 2, 'Registered in ten minutes, on her phone.', { rep: 2 }),
        O('Send her to read the website', false, 0, 'She gives up for now.')] },
      { id: 'fns2', title: 'An error in a declaration', text: 'A pensioner claimed a property deduction twice by mistake.', opts: [
        O('Call him, explain, help him file a correction', true, 2, 'No fine: he corrected it himself.'),
        O('Fine him at once', false, -1, 'Legal, but the appeal takes a month of your time.')] },
      { id: 'fns3', title: 'A shop with no receipts', text: 'A check finds a shop selling without a cash register.', opts: [
        O('Write the violation, explain how to register the till', true, 3, 'Next month they issue receipts.'),
        O('The owner offers to "settle"', false, 0, '15,000 roubles. The shop goes on without receipts.', { bribe: 15000 })] },
      { id: 'fns4', title: 'Property tax for a large family', text: 'A mother of three asks if she has a benefit on land tax.', opts: [
        O('Check: yes, a deduction for large families; file it with her', true, 2, 'She pays less from this year.', { rep: 1 }),
        O('"Read the law"', false, -1, 'She pays more than she has to.')] },
      { id: 'fns5', title: 'The end of the quarter', text: 'A pile of reports and a deadline tonight.', opts: [
        O('Stay focused, ask a colleague to share the pile', true, 2, 'Done by seven. You owe her a coffee.'),
        O('Sign without reading', false, -2, 'Two mistakes go out under your signature.', { stress: 4 })] },
    ] },
  { id: 'customs', name: 'Customs inspector at the airport', ru: 'Инспектор таможни в аэропорту', org: 'Federal Customs Service (FTS)', orgRu: 'ФТС России', icon: '🛃', kind: 'service',
    base: 3600, energy: 20, stress: 7, cit: true, know: 40, fit: true, start: 8 * H, end: 20 * H, ranks: CIVIL_RANKS, ranksRu: CIVIL_RANKS_RU, office: 'the customs post at the airport',
    cases: [
      { id: 'cus1', title: 'Cash over the limit', text: 'A passenger in the green channel has 15,000 dollars in his bag. Over 10,000 must be declared.', opts: [
        O('Stop him, write the case, explain the declaration', true, 3, 'The excess over the limit may be confiscated; the court decides.'),
        O('Let him fill in a declaration now and go', false, -1, 'Too late for that: he had already passed. Your boss is not pleased.'),
        O('A "gift" makes it disappear', false, 0, '500 dollars in your hand, about 45,000 roubles.', { bribe: 45000 })] },
      { id: 'cus2', title: 'A suitcase of home-made sausage', text: 'Ten kilos of meat from a country with animal disease rules.', opts: [
        O('Call the veterinary inspector; it is destroyed by the rules', true, 2, 'The passenger is sad. The rules exist for swine fever.'),
        O('Let it pass, it smells good', false, -2, 'A random check finds it in the next room.')] },
      { id: 'cus3', title: 'Medicine in a bag', text: 'A woman carries strong painkillers for her mother.', opts: [
        O('Check the prescription and the quantity; it is fine', true, 2, 'A prescription in her name, a normal amount. She goes.', { rep: 1 }),
        O('Confiscate everything, to be safe', false, -2, 'Her mother is in pain for a week. A complaint.')] },
      { id: 'cus4', title: 'A tip from the profiling system', text: 'The system flags a passenger. He looks calm.', opts: [
        O('Check by the procedure, politely', true, 2, 'Nothing found. He thanks you for the courtesy.'),
        O('Search him roughly, in front of everyone', false, -2, 'Nothing found, and a video.')] },
      { id: 'cus5', title: 'A colleague waves a friend through', text: 'You see a colleague let a friend\'s heavy cases pass unchecked.', opts: [
        O('Report it to the head of the shift', true, 2, 'An awkward week. The right thing.', { stress: 4 }),
        O('Look away', false, -1, 'Nothing happens. Until it does.')] },
    ] },
  { id: 'mchs', name: 'Firefighter-rescuer', ru: 'Пожарный-спасатель', org: 'Emergencies Ministry (MChS)', orgRu: 'МЧС России', icon: '🚒', kind: 'service',
    base: 3200, energy: 30, stress: 7, cit: true, know: 20, fit: true, start: 8 * H, end: 20 * H, ranks: ['Private of internal service', 'Junior sergeant', 'Sergeant', 'Senior sergeant', 'Lieutenant'], ranksRu: ['Рядовой внутренней службы', 'Младший сержант', 'Сержант', 'Старший сержант', 'Лейтенант'], office: 'the fire station',
    cases: [
      { id: 'mchs1', title: 'A kitchen on fire', text: 'Oil caught fire in a pan on the ninth floor; smoke in the stairwell.', opts: [
        O('Breathing apparatus on, evacuate the floor, then the fire', true, 4, 'Everyone out, the kitchen is black, nobody hurt.', { rep: 2 }),
        O('Go straight in without the mask', false, -2, 'It is out, but you cough for a week.', { stress: 6 })] },
      { id: 'mchs2', title: 'Spring grass burning', text: 'Someone is burning last year\'s grass next to the dachas.', opts: [
        O('Put it out and explain the fine for burning grass', true, 2, 'No houses lost this time.'),
        O('Put it out and leave', true, 1, 'It is out.')] },
      { id: 'mchs3', title: 'A school fire drill', text: 'The head teacher asks you to run the drill.', opts: [
        O('Run it properly: timing, the exits, the smoke hood', true, 2, 'Four minutes to empty the school. The children loved the truck.', { rep: 2 }),
        O('Sign the paper without a drill', false, -2, 'The fire inspector finds out.')] },
      { id: 'mchs4', title: 'A man on the ice', text: 'A fisherman fell through the ice on the river.', opts: [
        O('Ladder and rope, lying flat, as trained', true, 4, 'He is out, blue and alive.', { rep: 3 }),
        O('Run onto the ice', false, -2, 'Now two people are in the water. Both pulled out, barely.', { stress: 10 })] },
      { id: 'mchs5', title: 'Smoke alarms for the elderly', text: 'A list of lonely pensioners who need free smoke alarms.', opts: [
        O('Install them, ten flats, with a word about heaters', true, 2, 'Tea in every flat. A long day.', { rep: 2 }),
        O('Leave the boxes at the doors', false, -1, 'Nobody installs them.')] },
    ] },
  { id: 'fssp', name: 'Bailiff', ru: 'Судебный пристав-исполнитель', org: 'Bailiffs Service (FSSP)', orgRu: 'ФССП России', icon: '⚖️', kind: 'service',
    base: 3000, energy: 20, stress: 9, cit: true, know: 40, fit: false, start: 9 * H, end: 18 * H, ranks: CIVIL_RANKS, ranksRu: CIVIL_RANKS_RU, office: 'the district bailiffs\' department',
    cases: [
      { id: 'fssp1', title: 'Unpaid child support', text: 'A father owes 120,000 roubles of child support and says he has nothing.', opts: [
        O('Check his accounts and car; set a payment plan; limit travel abroad', true, 3, 'He finds money quickly when the holiday is at risk.'),
        O('Close the case: "nothing to take"', false, -3, 'The mother complains to the prosecutor.')] },
      { id: 'fssp2', title: 'A debtor offers half', text: 'He offers half of the debt to you, in cash, "and we forget the rest".', opts: [
        O('Refuse; payments go only to the official account', true, 2, 'He pays the first part properly.'),
        O('Take it', false, 0, '20,000 roubles, and a debtor who will talk.', { bribe: 20000 })] },
      { id: 'fssp3', title: 'A ban on leaving the country', text: 'A woman with a 40,000 rouble debt is flying tomorrow.', opts: [
        O('Explain: pay the debt and the ban is lifted', true, 2, 'She pays on her phone at the desk.'),
        O('Lift the ban as a favour', false, -3, 'Not yours to give.')] },
      { id: 'fssp4', title: 'Seizing a car', text: 'The court ordered a car seized; the owner blocks the gate.', opts: [
        O('Call the police for support, explain the order calmly', true, 2, 'The car goes on the tow truck without a fight.'),
        O('Push past him', false, -2, 'A scuffle on camera.', { stress: 6 })] },
      { id: 'fssp5', title: 'A pensioner with a wrong debt', text: 'Money was taken from a pension for someone else\'s debt with the same name.', opts: [
        O('Check the date of birth, return it, apologise', true, 3, 'She cries with relief.', { rep: 2 }),
        O('Tell her to go to court', false, -2, 'She does. The court sides with her and names you.')] },
    ] },
  { id: 'mfc', name: 'MFC specialist ("My Documents")', ru: 'Специалист МФЦ («Мои документы»)', org: 'Multifunctional centre (MFC)', orgRu: 'МФЦ', icon: '🗂️', kind: 'state',
    base: 2600, energy: 16, stress: 6, cit: false, know: 35, fit: false, start: 8 * H, end: 20 * H, ranks: ['Operator', 'Specialist', 'Senior specialist', 'Shift leader', 'Head of the office'], ranksRu: ['Оператор', 'Специалист', 'Старший специалист', 'Начальник смены', 'Руководитель офиса'], office: 'the MFC office',
    cases: [
      { id: 'mfc1', title: 'A passport without a photo', text: 'A man wants a new internal passport but brought no photos.', opts: [
        O('Send him to the photo booth in the hall and keep his number', true, 2, 'Back in ten minutes, done.', { rep: 1 }),
        O('Send him home', false, -1, 'He loses a day.')] },
      { id: 'mfc2', title: 'A pensioner and the online services', text: 'She needs a pension statement but has no account on the state portal.', opts: [
        O('Make the statement here and help create the account', true, 2, 'She leaves with both, and a sticky note of her password at home.', { rep: 2 }),
        O('"Everything is online now"', false, -2, 'She has no idea what that means.')] },
      { id: 'mfc3', title: 'Someone pushes in', text: 'A man says he is "only asking a question" and pushes to your window.', opts: [
        O('Politely ask him to take a number; offer the info desk', true, 1, 'The queue relaxes.'),
        O('Serve him to keep the peace', false, -1, 'The queue does not relax.')] },
      { id: 'mfc4', title: 'Documents for a child\'s benefit', text: 'A young mother has everything but one certificate.', opts: [
        O('Check what can be requested between offices; take it', true, 3, 'The office requests it itself. She does not come back.', { rep: 2 }),
        O('Refuse until she brings it', false, -1, 'Legal, but unnecessary.')] },
      { id: 'mfc5', title: 'A gift box of chocolates', text: 'A grateful client leaves chocolates on your desk.', opts: [
        O('Thank her; put them in the staff room for everyone', true, 1, 'The team eats them by noon.'),
        O('Take them home', true, 0, 'Very good chocolates.')] },
    ] },
  { id: 'rzd', name: 'Train conductor (Russian Railways)', ru: 'Проводник пассажирского вагона (РЖД)', org: 'Russian Railways (RZD)', orgRu: 'РЖД', icon: '🚆', kind: 'state',
    base: 2800, energy: 24, stress: 6, cit: false, know: 25, fit: false, start: 7 * H, end: 19 * H, ranks: ['Conductor', 'Conductor, 2nd grade', 'Conductor, 1st grade', 'Senior conductor', 'Head of the train'], ranksRu: ['Проводник', 'Проводник 2 разряда', 'Проводник 1 разряда', 'Старший проводник', 'Начальник поезда'], office: 'the depot and the train',
    cases: [
      { id: 'rzd1', title: 'A passenger without a ticket', text: 'A student says her ticket is "somewhere in the phone".', opts: [
        O('Check her passport against the list: e-tickets are on it', true, 2, 'She is on the list. Seat 14.'),
        O('Put her off at the next station', false, -2, 'She had a ticket. A complaint.')] },
      { id: 'rzd2', title: 'A loud drunk in the platzkart', text: 'At midnight a man is singing and the children cannot sleep.', opts: [
        O('Calm him, call the train police at the next stop if needed', true, 2, 'He sleeps by one.'),
        O('Sell him another beer', false, -2, 'He sings until four.')] },
      { id: 'rzd3', title: 'Tea, sugar and the samovar', text: 'Everyone wants tea in the famous glass holders.', opts: [
        O('Make tea for the whole car, with a smile', true, 2, 'Someone writes a kind review.', { rep: 2 }),
        O('Tea only if they come and ask', true, 0, 'Fine.')] },
      { id: 'rzd4', title: 'A passenger falls ill', text: 'An older man has chest pain at night.', opts: [
        O('Call the head of the train; an ambulance meets the train at the next station', true, 4, 'He is in hospital in time.', { rep: 2 }),
        O('Give him a painkiller and hope', false, -3, 'It is not a headache.')] },
      { id: 'rzd5', title: 'A "free" ride for cash', text: 'A man offers 1,000 roubles to ride without a ticket.', opts: [
        O('Refuse; he can buy a ticket from you by the rules', true, 2, 'He buys one.'),
        O('Take it', false, 0, '1,000 roubles. The audit counts heads.', { bribe: 1000 })] },
    ] },
  { id: 'post', name: 'Post office operator (Russian Post)', ru: 'Оператор почтовой связи (Почта России)', org: 'Russian Post', orgRu: 'Почта России', icon: '📮', kind: 'state',
    base: 2000, energy: 16, stress: 6, cit: false, know: 20, fit: false, start: 8 * H, end: 20 * H, ranks: ['Operator', 'Operator, 2nd class', 'Operator, 1st class', 'Deputy head of office', 'Head of the office'], ranksRu: ['Оператор', 'Оператор 2 класса', 'Оператор 1 класса', 'Заместитель начальника', 'Начальник отделения'], office: 'the post office',
    cases: [
      { id: 'post1', title: 'A parcel without ID', text: 'A man wants his son\'s parcel but has only the SMS.', opts: [
        O('Explain: the code from the app or a power of attorney', true, 2, 'The son sends the code. Done.'),
        O('Give it anyway', false, -2, 'It was not his son\'s.')] },
      { id: 'post2', title: 'Pension day', text: 'A line of pensioners for their pensions and the newspaper.', opts: [
        O('Patiently, one by one, with a chair for the oldest', true, 2, 'Somebody brings you pies the next week.', { rep: 2 }),
        O('Rush them', false, -1, 'A lot of sighs.')] },
      { id: 'post3', title: 'A lost registered letter', text: 'A letter from the court is "lost". The client is furious.', opts: [
        O('Open a search by the tracking number', true, 2, 'It is in the sorting centre. Two days.'),
        O('Say it is the court\'s fault', false, -1, 'It is not.')] },
      { id: 'post4', title: 'Selling lottery tickets', text: 'The plan says sell fifty lottery tickets today.', opts: [
        O('Offer them politely, no pressure', true, 1, 'Twelve sold. Nobody cheated.'),
        O('Give lottery tickets as "change"', false, -2, 'A complaint, and a fair one.')] },
      { id: 'post5', title: 'A parcel from abroad', text: 'A customs duty is due on a parcel over the duty-free limit.', opts: [
        O('Explain the duty and how to pay it', true, 2, 'Paid at the window, parcel handed over.'),
        O('Hand it over without the duty', false, -3, 'The office pays it from your bonus.')] },
    ] },
];
export const roleOf = (id: string): Role | undefined => ROLES.find(r => r.id === id);

/* ---------- the state of the player's service ---------- */
export type Mode = 'metro' | 'bus' | 'walk' | 'car' | 'taxi';
export type Park = 'lot' | 'street' | 'pavement';
export interface Application { role: RoleId; stage: 'sent' | 'interview' | 'checks' | 'offer' | 'refused'; due: number; why?: string }
export interface Workday { day: number; at: number; late: boolean; mode: Mode; park: Park | null; cases: Record<string, number>; lunch: boolean; out: boolean }
export interface Colleague { name: string; rel: number }
export interface ServiceState {
  role: RoleId | null; badge: string; since: number; shifts: number; merit: number; reprimands: number; lates: number[]; commend: number; earned: number;
  app: Application | null; banUntil: number; today: Workday | null; colleagues: Colleague[]; log: string[]; bribes: number;
  title?: string; titleRu?: string;          // the job's name for the page's header
  city?: string;                             // where the job is
}
export interface Result { ok: boolean; msg: string }
type S = State & { service?: ServiceState };
export const serviceOf = (s: State): ServiceState => {
  const x = s as S;
  if (!x.service || typeof x.service !== 'object') x.service = { role: null, badge: '', since: 0, shifts: 0, merit: 0, reprimands: 0, lates: [], commend: 0, earned: 0, app: null, banUntil: -1, today: null, colleagues: [], log: [], bribes: 0 };
  const v = x.service; if (v.role && !v.title) { const r = ROLES.find(q => q.id === v.role); v.title = r?.name; v.titleRu = r?.ru; }      // saves from before the title
  return v;
};
const hash = (t: string): number => { let h = 2166136261; for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619) >>> 0; return h; };
const clamp = (v: number, lo = 0, hi = 100): number => Math.max(lo, Math.min(hi, v));
const fmt = (n: number): string => Math.round(n).toLocaleString('en-US');
const no = (msg: string): Result => ({ ok: false, msg });
const note = (sv: ServiceState, s: State, m: string): Result => { sv.log.unshift(`Day ${s.day + 1}: ${m}`); sv.log = sv.log.slice(0, 30); return { ok: true, msg: m }; };
export const clock = (min: number): string => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const NAMES = ['Andrei', 'Olga', 'Timur', 'Svetlana', 'Ruslan', 'Irina', 'Dmitry', 'Aigul', 'Sergei', 'Natalia', 'Ilnur', 'Yulia'];

/* ---------- the vacancy board and applying ---------- */
/** The merit needed for each rank, and the pay of each rank (each step about 8% more). */
export const RANK_AT = [0, 60, 160, 320, 560];           // an honest day earns about 8: the first step after about 8 days, the top after about 70
export const rankOf = (s: State): number => { const m = serviceOf(s).merit; let r = 0; RANK_AT.forEach((v, i) => { if (m >= v) r = i; }); return r; };
export const payOf = (s: State, role: Role): number => Math.round(role.base * (1 + 0.08 * rankOf(s)) / 10) * 10;
/** About a month's pay, as the board shows it (22 working days). */
export const monthly = (role: Role): number => Math.round(role.base * 22 / 1000) * 1000;
const citizen = (s: State): boolean => s.status === 'citizen' || !!s.flags.naturalized;
/** Why the player may not apply for this role now (null when they may). */
export function cannotApply(s: State, id: RoleId): string | null {
  const r = roleOf(id), sv = serviceOf(s); if (!r) return 'No such vacancy.';
  if (sv.role === id) return 'You already work here.';
  if (sv.app && sv.app.stage !== 'refused') return 'You have an application in progress.';
  if (s.day < sv.banUntil) return `After a dismissal the state services do not take you back before day ${sv.banUntil + 1}.`;
  if (r.cit && !citizen(s)) return 'Service in the police and the civil service is for Russian citizens only.';
  if (!r.cit && s.status !== 'citizen' && G_problems(s).length) return 'You need your papers in order (registration, the right to work) to be hired.';
  if (s.know < r.know) return `Knowledge ${r.know} is needed (the Russian language and the rules).`;
  return null;
}
/** A copy of the engine's check of papers, kept small here (registration, patent, student visa), so this file needs only the State type. */
function G_problems(s: State): string[] {
  const p: string[] = [];
  if (s.status === 'citizen' || s.flags.rvp) return p;
  if (s.docs.reg <= 0) p.push('registration');
  if (s.status === 'migrant' && s.docs.patent <= 0) p.push('patent');
  if (s.status === 'student' && !s.flags.workPermit) p.push('student work permit');
  return p;
}
export function apply(s: State, id: RoleId): Result {
  const why = cannotApply(s, id); if (why) return no(why);
  const sv = serviceOf(s); sv.app = { role: id, stage: 'sent', due: s.day + 2 };
  return note(sv, s, `Application sent: ${roleOf(id)!.name}. The personnel department will call you in two days.`);
}
/** Moves the application on when its day has come (the call for an interview; the results of the checks). */
export function tickApplication(s: State): string | null {
  const sv = serviceOf(s), a = sv.app; if (!a || s.day < a.due) return null;
  const r = roleOf(a.role)!;
  if (a.stage === 'sent') { a.stage = 'interview'; return note(sv, s, `The personnel department invites you to an interview for ${r.name}.`).msg; }
  if (a.stage === 'checks') {
    const fail = r.fit && s.health < 60 ? 'the medical commission and the fitness test (health 60 is needed)' : s.strikes > 0 ? 'the background check (your record of violations)' : null;
    if (fail) { a.stage = 'refused'; a.why = fail; return note(sv, s, `Not hired: ${fail}.`).msg; }
    a.stage = 'offer'; return note(sv, s, `The checks are passed. ${r.org} offers you the position.`).msg;
  }
  return null;
}
export const INTERVIEW: { q: string; a: { t: string; ok: boolean }[] }[] = [
  { q: 'Why do you want to work for us?', a: [{ t: 'To serve people and do the job by the law.', ok: true }, { t: 'For the uniform and the power.', ok: false }, { t: 'I heard there are extras on the side.', ok: false }] },
  { q: 'A relative asks you to help him with a fine at your work. What do you do?', a: [{ t: 'Explain how to pay or appeal it, like anyone else.', ok: true }, { t: 'Help: family is family.', ok: false }] },
  { q: 'You are offered money to close your eyes. What do you do?', a: [{ t: 'Refuse and report it.', ok: true }, { t: 'Depends how much.', ok: false }] },
  { q: 'How do you deal with an angry person?', a: [{ t: 'Calmly, by the procedure, and I explain the next step.', ok: true }, { t: 'I raise my voice so they listen.', ok: false }] },
];
/** The interview: two right answers of three are needed; then the checks take five days (a week for the services with a fitness test). */
export function interview(s: State, answers: number[]): Result {
  const sv = serviceOf(s), a = sv.app; if (!a || a.stage !== 'interview') return no('There is no interview to go to.');
  const qs = interviewFor(s), right = qs.filter((q, i) => INTERVIEW[q].a[answers[i]]?.ok).length;
  if (right < 2) { a.stage = 'refused'; a.why = 'the interview'; return { ok: false, msg: note(sv, s, 'Not hired: the interview did not go well. You may apply again.').msg }; }
  const r = roleOf(a.role)!; a.stage = 'checks'; a.due = s.day + (r.fit ? 7 : 5);
  return note(sv, s, r.fit ? 'Interview passed. Next: the medical commission, the fitness test, the psychologist and the background check (about a week).' : 'Interview passed. The background check takes about five days.');
}
export const interviewFor = (s: State): number[] => { const a = hash(`iv|${s.name}|${serviceOf(s).app?.role}`) % INTERVIEW.length; return [a, (a + 1) % INTERVIEW.length, (a + 2) % INTERVIEW.length]; };
/** Accepting the offer: the old job is left, the oath taken (for the services with ranks), a badge number, three colleagues. */
export function accept(s: State): Result {
  const sv = serviceOf(s), a = sv.app; if (!a || a.stage !== 'offer') return no('There is no offer to accept.');
  const r = roleOf(a.role)!, old = s.job; s.job = null;
  sv.role = r.id; sv.title = r.name; sv.titleRu = r.ru; sv.city = s.city; sv.app = null; sv.since = s.day; sv.shifts = 0; sv.merit = 0; sv.reprimands = 0; sv.lates = []; sv.commend = 0; sv.today = null;
  sv.badge = `${r.id.toUpperCase()}-${String(100000 + hash(s.name + r.id) % 900000)}`;
  sv.colleagues = [0, 1, 2].map(i => ({ name: NAMES[(hash(r.id + s.name) + i * 5) % NAMES.length], rel: 40 }));
  return note(sv, s, `${r.kind === 'service' ? 'You took the oath. ' : ''}Welcome to ${r.org} in ${s.city}: ${r.name}, badge ${sv.badge}.${old ? ' You left your old job.' : ''}`);
}
/** Leaving the service on one's own. */
export function resign(s: State): Result { const sv = serviceOf(s); if (!sv.role) return no('You do not work for the state.'); const r = roleOf(sv.role)!; sv.role = null; sv.title = undefined; sv.today = null; return note(sv, s, `You resigned from ${r.org}.`); }

/* ---------- a working day ---------- */
export const DEPART = [6 * H + 30, 7 * H, 7 * H + 30, 8 * H, 8 * H + 30];
export const LOT_CLOSES = 8 * H + 15;             // the staff car park is full after this
export const STREET_RATE = 150;                    // paid street parking, roubles an hour
export const PAVEMENT_FINE = 3000;
const METRO = ['Moscow', 'Saint Petersburg', 'Nizhny Novgorod', 'Novosibirsk', 'Kazan', 'Samara', 'Yekaterinburg'];
export const modesFor = (s: State): Mode[] => [METRO.includes(s.city) ? 'metro' : 'bus', 'walk', ...(s.car ? ['car' as Mode] : []), 'taxi'];
/** How long the way to work takes, by the mode, the hour (the later, the more traffic) and the weather; the same for the same day. */
export function travel(s: State, mode: Mode, depart: number): number {
  const r = hash(`way|${s.day}|${mode}|${s.city}`) % 15, bad = s.weather === 'snow' || s.weather === 'rain' ? 1 : 0, rush = depart >= 7 * H + 30 ? 1 : 0;
  if (mode === 'walk') return 50 + r + bad * 10;
  if (mode === 'metro') return 35 + r;
  if (mode === 'bus') return 40 + r + bad * 15 + rush * 10;
  return 25 + r + bad * 20 + rush * 25 - (mode === 'taxi' ? 5 : 0);
}
export const fareOf = (mode: Mode): number => mode === 'metro' || mode === 'bus' ? 70 : mode === 'taxi' ? 650 : 0;
/** Leaves home and gets to work: the way, the parking (by car), the checkpoint. Late is late, by the minute. */
export function goToWork(s: State, depart: number, mode: Mode, park: Park = 'lot'): Result {
  const sv = serviceOf(s), r = sv.role ? roleOf(sv.role) : null; if (!r) return no('You do not work for the state.');
  if (sv.today?.day === s.day) return no('You are at work already today.');
  if (s.slot > 0) return no('The working day starts in the morning. Go tomorrow morning.');
  if (sv.city && sv.city !== s.city) return no(`Your job is in ${sv.city}. Go back there, or resign and find a vacancy here.`);
  if (!DEPART.includes(depart)) return no('Choose when to leave.');
  if (!modesFor(s).includes(mode)) return no('You cannot go that way.');
  if (s.energy < r.energy + 5) return no('You are too tired for a working day. Rest, or call in sick.');
  const fare = fareOf(mode); if (s.money < fare) return no('You do not have the fare.');
  s.money -= fare;
  let at = depart + travel(s, mode, depart), parking: Park | null = null; const lines: string[] = [];
  if (mode === 'car') {
    parking = park;
    if (park === 'lot' && at > LOT_CLOSES) { parking = 'street'; lines.push('The staff car park was full; you parked on the street (paid by the hour).'); }
    if (parking === 'street') at += 8;                                   // walking from the street
    if (parking === 'lot') lines.push('Your staff pass opened the barrier of the car park.');
    if (parking === 'pavement') lines.push('You left the car on the pavement by the entrance.');
  }
  const late = at > r.start;
  sv.today = { day: s.day, at, late, mode, park: parking, cases: {}, lunch: false, out: false };
  if (late) {
    sv.lates = [...sv.lates.filter(d => s.day - d < 10), s.day];
    if (sv.lates.length >= 2) { sv.reprimands++; lines.push(`Late again (${clock(at)}, the day starts at ${clock(r.start)}): a reprimand in your file.`); }
    else lines.push(`You came at ${clock(at)}, the day starts at ${clock(r.start)}. A warning from the head of the shift.`);
  } else lines.push(`You came at ${clock(at)} and showed your pass at the checkpoint of ${r.office}.`);
  return note(sv, s, lines.join(' '));
}
/** The three cases of the day, the same all day. */
export const casesToday = (s: State): Case[] => { const sv = serviceOf(s), r = sv.role ? roleOf(sv.role) : null; if (!r) return []; const k = hash(`cases|${s.day}|${r.id}`) % r.cases.length; return [0, 1, 2].map(i => r.cases[(k + i) % r.cases.length]); };
/** A decision on a case. A bribe pays, but each time internal security may be watching: then it is dismissal and a criminal record. */
export function decide(s: State, caseId: string, opt: number): Result {
  const sv = serviceOf(s), d = sv.today; if (!d || d.day !== s.day || d.out) return no('You are not at work.');
  const c = casesToday(s).find(x => x.id === caseId); if (!c) return no('That case is not on your desk today.');
  if (d.cases[caseId] !== undefined) return no('You have decided that case.');
  const o = c.opts[opt]; if (!o) return no('Choose what to do.');
  d.cases[caseId] = opt; sv.merit = Math.max(0, sv.merit + o.merit); s.rep = clamp(s.rep + (o.rep ?? 0)); s.stress = clamp(s.stress + (o.stress ?? 0));
  if (o.bribe) {
    sv.bribes++; s.money += o.bribe;
    if (hash(`caught|${s.name}|${s.day}|${caseId}`) % 100 < 20 + sv.bribes * 10) {
      const r = roleOf(sv.role!)!; sv.role = null; sv.title = undefined; sv.today = null; sv.banUntil = s.day + 180; s.strikes++; s.rep = clamp(s.rep - 15); s.money -= o.bribe;
      return { ok: true, msg: note(sv, s, `Internal security was watching: the money was marked. Dismissed from ${r.org} and a criminal case for taking a bribe.`).msg };
    }
  }
  return note(sv, s, `${c.title}: ${o.out}`);
}
/** Lunch with a colleague: better relations, a little rest. */
export function lunch(s: State, who: number): Result {
  const sv = serviceOf(s), d = sv.today; if (!d || d.day !== s.day || d.out) return no('You are not at work.');
  if (d.lunch) return no('You had lunch already.'); const c = sv.colleagues[who]; if (!c) return no('Who?');
  d.lunch = true; c.rel = clamp(c.rel + 8); s.stress = clamp(s.stress - 3); s.money -= 250;
  const n = (s as State & { needs?: { social: number; hunger: number } }).needs; if (n) { n.social = clamp(n.social + 10); n.hunger = clamp(n.hunger + 25); }
  return note(sv, s, `Lunch in the canteen with ${c.name} (250 ₽). You hear who is who in the office.`);
}
export type Leave = 'ontime' | 'overtime' | 'early';
/** Leaving work: the pay of the day (by rank, more for staying late), the street parking or the fine, merit for good days, and the rank. */
export function leaveWork(s: State, how: Leave): Result {
  const sv = serviceOf(s), d = sv.today, r = sv.role ? roleOf(sv.role) : null; if (!d || !r || d.day !== s.day || d.out) return no('You are not at work.');
  const open = casesToday(s).filter(c => d.cases[c.id] === undefined).length;
  if (how !== 'early' && open) return no(`Decide the ${open} case${open === 1 ? '' : 's'} on your desk first, or leave early.`);
  d.out = true;
  while (!s.over && s.slot < (how === 'early' ? 1 : 2) && s.day === d.day) advance(s);           // the day at work passes
  const before = rankOf(s), pay = Math.round(payOf(s, r) * (how === 'overtime' ? 1.25 : how === 'early' ? 0.6 : 1));
  s.money += pay; sv.earned += pay; s.energy = clamp(s.energy - r.energy - (how === 'overtime' ? 8 : 0)); s.stress = clamp(s.stress + r.stress);
  const lines = [`Out at ${clock(how === 'overtime' ? r.end + 2 * H : how === 'early' ? r.end - 3 * H : r.end)}: ${fmt(pay)} roubles for the day.`];
  if (d.mode === 'car' && d.park === 'street') { const hrs = Math.ceil((r.end - d.at) / H) + (how === 'overtime' ? 2 : 0); s.money -= hrs * STREET_RATE; lines.push(`Street parking: ${hrs} h × ${STREET_RATE} ₽.`); }
  if (d.mode === 'car' && d.park === 'pavement' && hash(`tow|${s.day}`) % 2 === 0) { s.money -= PAVEMENT_FINE; lines.push(`A fine for parking on the pavement: ${fmt(PAVEMENT_FINE)} ₽.`); }
  if (how === 'early') { sv.reprimands++; lines.push('Leaving early without leave: a reprimand.'); }
  else { sv.shifts++; if (!d.late && open === 0) sv.merit += 1; if (how === 'overtime') sv.merit += 1; }
  if (sv.shifts > 0 && sv.shifts % 20 === 0 && sv.reprimands === 0) { sv.commend++; lines.push('A letter of thanks from the head of the department for twenty clean days.'); }
  if (rankOf(s) > before) lines.push(`Promoted: ${r.ranks[rankOf(s)]}.`);
  if (sv.reprimands >= 4) { sv.role = null; sv.title = undefined; sv.banUntil = s.day + 60; lines.push(`Four reprimands: dismissed from ${r.org}.`); }
  return note(sv, s, lines.join(' '));
}
