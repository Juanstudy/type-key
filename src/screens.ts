export { VERSION, buildMenu } from "./screens/menu";
export { buildGame } from "./screens/game";
export { buildResults } from "./screens/results";
export {
	buildHistory,
	buildEmptyHistory,
	buildHistoryDetail,
} from "./screens/history";
export { wordText } from "./ui/word-display";
export { shuffleWords } from "./lib/wordlists";
export { getRandomQuote, quoteToWords } from "./lib/quotes";
export type { SessionResult, Quote } from "./lib/types";
