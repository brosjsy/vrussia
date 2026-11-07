/* The content bundle: importing this file registers every scenario of the game, then builds the lookup table (index()).
   Each './...' import below is a file that calls S({...}) to add scenarios (see engine.ts, "registry"). To add a new group of scenarios, create a file in
   content/packs/, call S() in it, and import it here. The order matters only for the few scenarios that refer to each other by id. */
import { index, countStats } from '../engine';
import './core';
import './generated';
import './life';
import './culture';
import './services';
import '../flights';
import '../flows';
import './packs/cities';
import './packs/cuisine';
import './packs/jobs';
import './packs/knowledge';
import './packs/everyday';
import './packs/calendar';
import './packs/homeculture';
import './packs/homeculture-cis';
import './packs/transport';
import './packs/workdays';
import './packs/infants';
import './packs/studentlife';
import './packs/rights';
import './packs/rules2026';
import './packs/daily2026';
import './packs/dacha';
import './packs/building';
import './packs/scams';
import './packs/sport';
import './packs/language';
import './packs/flat';
import './packs/payday';
import './packs/rail';
import './packs/school';
import './packs/emergency';
import './packs/shopping';
import './packs/parcels';
import './packs/services';
import './business';
import './arcs';
import './arcs2';
import './arcs3';
import './arcs4';
import './arcs5';
import './studies';
import './fines';
import './year';

index();

export { countStats };
