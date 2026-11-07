# Community scenario packs

A pack is one JSON file with extra scenarios. Open **More → Community scenario packs**, press “Download a template”, edit it, and choose the file. The game checks it and lists every problem in plain words; nothing is added unless the whole pack is valid. Packs stay in the browser that added them.

```json
{
  "format": "vrussia-pack", "version": 1, "id": "myclass", "name": "My first pack", "author": "Your name",
  "scenarios": [{
    "id": "bus-ticket", "title": "The bus conductor", "who": ["migrant", "student"], "months": [9, 10], "w": 1, "once": false,
    "text": "On the bus the conductor asks for your fare. You are not sure how much it costs in this city.",
    "choices": [
      { "t": "Ask the passenger next to you", "msg": "She tells you the price and where to buy a card.", "fx": { "know": 1, "friends": 1 } },
      { "t": "Hand over a large note", "msg": "The conductor sighs, but gives change.", "fx": { "money": -100, "stress": 2 } }
    ]
  }]
}
```

Rules: pack `id` 2 to 20 small letters or digits; scenario `id` 2 to 30 small letters, digits or dashes, unique; at most 60 scenarios and 120 KB; text 10 to 700 characters; 2 to 4 choices; `who` is any of `citizen`, `migrant`, `eaeu`, `student`; `w` (how often) 0.1 to 3.

Effects (`fx`) are limited, per choice: `money` ±50,000; `energy` ±30; `health` ±20; `stress` ±30; `rep` ±15; `know` ±10; `strike` 0 or 1; `friends` ±3; `famLove` ±15; `merit` 0 to 3; `clothes` ±10; `flag` up to 3 names of small letters, digits or `_`. Anything else (changing papers, status, city, running code) is refused. Scenario ids are stored as `pack-<pack id>-<scenario id>`, so a pack cannot replace a scenario of the game.

Legal content: a pack that describes real rules should say where they come from. The game does not check facts.
