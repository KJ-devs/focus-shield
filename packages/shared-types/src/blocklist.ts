import type { BlocklistCategory, RuleType, ProcessAction } from "./enums";

export interface BlocklistPreset {
  id: string;
  name: string;
  icon: string;
  category: BlocklistCategory;
  domains: DomainRule[];
  processes: ProcessRule[];
  isBuiltIn: boolean;
  createdAt: Date;
}

export interface DomainRule {
  pattern: string; // e.g. "*.reddit.com", "youtube.com/shorts/*"
  type: RuleType;
}

export interface ProcessRule {
  name: string;
  aliases: string[]; // e.g. ["Discord.exe", "discord-ptb"]
  action: ProcessAction;
}

// Union type for any block rule (domain or process)
export type BlockRule = DomainRule | ProcessRule;
