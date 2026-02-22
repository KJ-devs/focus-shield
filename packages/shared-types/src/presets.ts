import type { SessionBlock } from "./session";

export interface SessionPreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  blocks: SessionBlock[];
  isBuiltIn: boolean;
}
