import { CORE_DEV_TOOLS } from "./core-dev";
import { WEB_TOOLS } from "./web";
import { DATA_TOOLS } from "./data";
import { INFRA_TOOLS } from "./infra";
import { CREATIVE_TOOLS } from "./creative";
import { EXPANSION_TOOLS } from "./expansion";
import { COVERAGE_TOOLS } from "./coverage";
import { UI_UX_TOOLS } from "./ui-ux";
import type { SeedTool } from "../types";

export const ALL_SEED_TOOLS: SeedTool[] = [
  ...CORE_DEV_TOOLS,
  ...WEB_TOOLS,
  ...DATA_TOOLS,
  ...INFRA_TOOLS,
  ...CREATIVE_TOOLS,
  ...EXPANSION_TOOLS,
  ...COVERAGE_TOOLS,
  ...UI_UX_TOOLS,
];
