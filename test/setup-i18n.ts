// Runs before every test file: the Russian interface texts are a separate download in the game, and the tests read them directly.
import { loadInterfaceRu } from '../src/i18n';

await loadInterfaceRu();
