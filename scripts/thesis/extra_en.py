# -*- coding: utf-8 -*-
"""English version of the extra sections (inserted before the given subsection headings)."""

EXTRA = {
'1.3 Market analysis': [
    ('h2', '1.2.1 Typology of fraud schemes'),
    ('p', 'To design the learning scenes, the schemes described by the Bank of Russia, the Interior Ministry and the Ministry of Digital Development were brought together in a typology (table X1). For each scheme the sign by which it can be recognised and the right action were identified. These signs became the basis of the explanations in the game: the player does not memorise separate stories but learns to see the common tricks — urgency, secrecy, a request for a code, a transfer "to a safe account", payment outside the platform.'),
    ('table', 'Table X1 — Typology of remote fraud schemes',
     [['Scheme', 'Sign', 'Right action'],
      ['"Bank security service", "safe account"', 'urgency, secrecy, a demand to transfer money', 'hang up, call the number on the card; "safe accounts" do not exist'],
      ['A call "from the FSB, the Central Bank, the police"', 'a chain of "officials", the threat of a criminal case', 'end the call, phone 102'],
      ['"Renewing the mobile contract", "doctor\'s appointment"', 'a request to tell the SMS code', 'never tell codes; check in the official app'],
      ['"Fake boss", a relative\'s voice', 'a new number, an unusual request, a deepfake', 'call back on a known number'],
      ['Messenger hijack ("voting")', 'logging in with the messenger on an outside site', 'do not enter data; ask the acquaintance in person'],
      ['Classified-ads sites and marketplaces', 'moving to a messenger, a link "to receive money"', 'pay only inside the platform'],
      ['Fake rental', 'a low price, prepayment for a viewing', 'do not pay before the viewing and the contract'],
      ['Recruiting droppers and couriers', 'easy money for handing over a card or cash', 'refuse: Art. 187 and Art. 159 of the Criminal Code'],
      ['Fake investments', 'guaranteed high returns', 'check the firm in the Bank of Russia registers'],
      ['Malicious "updates", QR codes', 'a link to install an app, a sticker over a code', 'install apps only from the official store']],
     [4.6, 5.2, 6.2]),
],
'2.4 Educational modules': [
    ('h2', '2.3.1 User journey: a foreign student\'s first week'),
    ('p', 'Take the character "foreign student from Lagos". Before travelling the player prepares: receives the university invitation, takes the tests, fills in the visa form (where the game deliberately makes typical mistakes that must be found), books the consulate on a calendar, passes the interview, buys a ticket with a connection and fills in the migration card at the border with the purpose "study".'),
    ('p', 'In Kazan the student moves into a dormitory, and the game gives the first-month checklist: a SIM card (since 2025 in person, through Gosuslugi and biometrics), migration registration, health insurance, a bank card, the timetable. On the third day comes a call about "renewing the mobile contract": if the player tells the code, a loan in his name is attempted in the evening; if the self-ban on loans was switched on in advance, the attack fails. '
            'At the end of the week the player does the first round of the quiz in the "Cyber safety" app and, in the 3D city, finds the Kul Sharif Mosque and learns that it opened in 2005. So in one game week the student goes through the same steps as in reality, without real risk.'),
    ('h2', '2.3.2 Teaching method and evaluation of results'),
    ('p', 'The learning goals of "Cyber life" are stated as observable actions: the player must recognise ten typical schemes by their signs; explain why SMS codes are never shared; name the steps after being fooled (block the card by the number on its back, report to the police, change passwords); switch on at least two protection tools and explain how they work. '
            'Learning follows the principle of the "safe mistake": the player can be fooled, see the consequences and the explanation, and later meet the same trick in another form.'),
    ('p', 'To evaluate effectiveness in the pilot a quasi-experimental design is proposed: participants take a test of 20 messages (half of them fraudulent) before the module and two weeks after; the control group reads the same rules as a leaflet. '
            'The main indicator is the gain in the share of correctly classified messages; additional ones are the share of participants who switched on a protection in real life (self-reported) and retention after a month. The target is a gain of at least 30 % over the baseline (table 9). Data are collected anonymously, with the participants\' consent and without passing personal data to third parties.'),
],
'3.3 Secure development': [
    ('h2', '3.2.1 Violators and attack scenarios'),
    ('p', 'An external violator with low potential uses public tools: guesses passwords, spams the chats, tries to inject malicious code into messages and adverts. An external violator with medium potential can attack the web application deliberately: cross-site request forgery, SQL injection, session theft, automated registration of bots. '
            'An internal violator — a registered player — may try to read other people\'s private messages, change other people\'s saves, get round daily limits, or lure other players into giving contacts for fraud outside the game. The last scenario is especially important for an educational platform: the game itself must not become a channel of social engineering. That is why phone numbers and messenger names are banned in messages and adverts, and chat is open only to adults.'),
    ('p', 'The attack scenarios are checked by tests that imitate the violator: a forged Origin header, reuse of an e-mail token, a request for other people\'s data with a swapped identifier, exceeding the limits. For several checks it was also confirmed that weakening the protection in the code makes the test fail, which shows the test really checks the measure.'),
],
'3.5 Testing and quality': [
    ('h2', '3.4.1 Operation and incident response'),
    ('p', 'For operation the following are provided: hosting in a data centre in Russia; a daily encrypted database backup with the key kept off the server; logging of security events (log-ins, password resets, blocks) without recording cookies or passwords; availability monitoring. '
            'The incident response plan covers detection (an abnormal number of failed log-ins, a surge of reports), containment (ending sessions, temporarily switching off a feature), removing the cause, restoring from backup and notification; in case of a personal-data leak Roskomnadzor is notified within the time limits of Article 21 of 152-FZ. A checklist of security checks is run for every release.'),
],
'4.5 Team': [
    ('h2', '4.4.1 Competitive advantages'),
    ('p', 'The strengths and weaknesses of the project, its opportunities and threats are summarised in table X2.'),
    ('table', 'Table X2 — SWOT analysis of the project',
     [['Strengths', 'Weaknesses'],
      ['a working product; a unique combination of a 3D city, procedures, language and anti-fraud; verified facts; its own secured server; free and without donations', 'a one-person team; no data on effectiveness with real users; the browser version needs WebGL'],
      ['Opportunities', 'Threats'],
      ['state goals for foreign students and for fighting IT crime; FASIE and IRI programmes; the ITMO business thesis; FADN adaptation centres', 'rapid changes in the law; competition for attention with entertainment games; customers\' budget limits']],
     [8.0, 8.0]),
    ('p', 'The main advantage is that the product already exists and is tested: the customer is offered not an idea but a ready platform for a pilot. The second is the absence of advertising and paid "cases", which matters for educational institutions and state partners. The third is verified facts: every rule in the game is backed by a legal act or official statistics and can be updated without rewriting the code.'),
],
'5.4 Alignment with state priorities': [
    ('h2', '5.3.1 Licence economics and a three-year forecast'),
    ('p', 'A licence for an organisation (a university, an adaptation centre) includes a branded version, reports on module completion, custom scenarios of local rules and support; the planned price is 150–400 thousand roubles a year depending on the number of users. Operating costs per organisation (server, support, updating the facts) are estimated at 40–60 thousand roubles a year. The three-year base-case forecast is given in table X3; all values are the author\'s planned estimates to be refined after the pilot.'),
    ('table', 'Table X3 — Three-year forecast (base case, thousand roubles)',
     [['Indicator', 'Year 1', 'Year 2', 'Year 3'],
      ['Grants', '1,000', '5,000', '—'],
      ['Licences (number × average price)', '—', '6 × 250 = 1,500', '20 × 250 = 5,000'],
      ['Custom scenarios', '—', '300', '800'],
      ['Total income', '1,000', '6,800', '5,800'],
      ['Costs', '1,000', '6,200', '5,000'],
      ['Result', '0', '600', '800']],
     [7.0, 3.0, 3.0, 3.0]),
    ('p', 'In the conservative case (half as many licences, no grant in year 2) the project moves to a minimal configuration: support by the founder, one server, a quarterly update of the facts; operating costs then stay below 250 thousand roubles a year and are covered by three licences. The social effect is therefore preserved in any funding scenario.'),
],
}
