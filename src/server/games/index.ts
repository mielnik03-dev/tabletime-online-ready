import type { GameModule } from "../types";
import bonjour from "./bonjour";
import shlyapa from "./shlyapa";
import perudo from "./perudo";
import loto from "./loto";
import parole from "./parole";
import veryu from "./veryu";
import kubiki from "./kubiki";
import chapayev from "./chapayev";

export const GAMES: Record<string, GameModule> = {
  bonjour,
  shlyapa,
  perudo,
  loto,
  parole,
  veryu,
  kubiki,
  chapayev,
};

export const GAME_LIST: GameModule[] = [
  bonjour, shlyapa, perudo, loto, parole, veryu, kubiki, chapayev,
];
