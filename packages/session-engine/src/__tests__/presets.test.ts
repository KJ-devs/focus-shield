import { PRESETS, getPreset, getAllPresets } from "../index";

describe("Presets", () => {
  describe("PRESETS constant", () => {
    it("should contain exactly 7 presets", () => {
      expect(Object.keys(PRESETS)).toHaveLength(7);
    });

    it("should contain all expected preset keys", () => {
      const expectedKeys = [
        "pomodoro",
        "deepWork",
        "sprint",
        "study",
        "flow",
        "quickTask",
        "marathon",
      ];

      expect(Object.keys(PRESETS)).toEqual(expect.arrayContaining(expectedKeys));
    });

    it("should have all presets marked as built-in", () => {
      for (const preset of Object.values(PRESETS)) {
        expect(preset.isBuiltIn).toBe(true);
      }
    });

    it("should have all presets with non-empty name", () => {
      for (const preset of Object.values(PRESETS)) {
        expect(preset.name).toBeTruthy();
        expect(typeof preset.name).toBe("string");
      }
    });

    it("should have all presets with non-empty id", () => {
      for (const preset of Object.values(PRESETS)) {
        expect(preset.id).toBeTruthy();
        expect(typeof preset.id).toBe("string");
      }
    });

    it("should have all presets with non-empty icon", () => {
      for (const preset of Object.values(PRESETS)) {
        expect(preset.icon).toBeTruthy();
        expect(typeof preset.icon).toBe("string");
      }
    });

    it("should have all presets with non-empty description", () => {
      for (const preset of Object.values(PRESETS)) {
        expect(preset.description).toBeTruthy();
        expect(typeof preset.description).toBe("string");
      }
    });

    it("should have all presets with at least one block", () => {
      for (const preset of Object.values(PRESETS)) {
        expect(preset.blocks.length).toBeGreaterThanOrEqual(1);
      }
    });

    it("should have all blocks with valid type (focus or break)", () => {
      for (const preset of Object.values(PRESETS)) {
        for (const block of preset.blocks) {
          expect(["focus", "break", "deep_focus"]).toContain(block.type);
        }
      }
    });

    it("should have all blocks with positive duration", () => {
      for (const preset of Object.values(PRESETS)) {
        for (const block of preset.blocks) {
          expect(block.duration).toBeGreaterThan(0);
        }
      }
    });

    it("should have all blocks with a boolean blockingEnabled", () => {
      for (const preset of Object.values(PRESETS)) {
        for (const block of preset.blocks) {
          expect(typeof block.blockingEnabled).toBe("boolean");
        }
      }
    });
  });

  describe("Pomodoro Classic preset", () => {
    it("should have 8 blocks (4 focus + 3 short break + 1 long break)", () => {
      const pomodoro = PRESETS["pomodoro"]!;

      expect(pomodoro.blocks).toHaveLength(8);
    });

    it("should alternate focus and break blocks", () => {
      const pomodoro = PRESETS["pomodoro"]!;
      const types = pomodoro.blocks.map((b) => b.type);

      expect(types).toEqual([
        "focus", "break", "focus", "break",
        "focus", "break", "focus", "break",
      ]);
    });

    it("should have 25-minute focus blocks", () => {
      const pomodoro = PRESETS["pomodoro"]!;
      const focusBlocks = pomodoro.blocks.filter((b) => b.type === "focus");

      for (const block of focusBlocks) {
        expect(block.duration).toBe(25);
      }
    });

    it("should have 5-minute short breaks and 15-minute long break", () => {
      const pomodoro = PRESETS["pomodoro"]!;
      const breakBlocks = pomodoro.blocks.filter((b) => b.type === "break");

      expect(breakBlocks).toHaveLength(4);
      expect(breakBlocks[0]!.duration).toBe(5);
      expect(breakBlocks[1]!.duration).toBe(5);
      expect(breakBlocks[2]!.duration).toBe(5);
      expect(breakBlocks[3]!.duration).toBe(15);
    });

    it("should have blocking enabled for focus blocks", () => {
      const pomodoro = PRESETS["pomodoro"]!;
      const focusBlocks = pomodoro.blocks.filter((b) => b.type === "focus");

      for (const block of focusBlocks) {
        expect(block.blockingEnabled).toBe(true);
      }
    });

    it("should have blocking disabled for break blocks", () => {
      const pomodoro = PRESETS["pomodoro"]!;
      const breakBlocks = pomodoro.blocks.filter((b) => b.type === "break");

      for (const block of breakBlocks) {
        expect(block.blockingEnabled).toBe(false);
      }
    });
  });

  describe("Deep Work preset", () => {
    it("should have a 90-minute focus and 20-minute break", () => {
      const dw = PRESETS["deepWork"]!;

      expect(dw.blocks).toHaveLength(2);
      expect(dw.blocks[0]).toEqual({
        type: "focus",
        duration: 90,
        blockingEnabled: true,
      });
      expect(dw.blocks[1]).toEqual({
        type: "break",
        duration: 20,
        blockingEnabled: false,
      });
    });
  });

  describe("Sprint preset", () => {
    it("should have a 45-minute focus and 10-minute break", () => {
      const sprint = PRESETS["sprint"]!;

      expect(sprint.blocks).toHaveLength(2);
      expect(sprint.blocks[0]!.duration).toBe(45);
      expect(sprint.blocks[1]!.duration).toBe(10);
    });
  });

  describe("Study Session preset", () => {
    it("should have a 50-minute focus and 10-minute break", () => {
      const study = PRESETS["study"]!;

      expect(study.blocks).toHaveLength(2);
      expect(study.blocks[0]!.duration).toBe(50);
      expect(study.blocks[1]!.duration).toBe(10);
    });
  });

  describe("Flow State preset", () => {
    it("should have a 120-minute focus and 30-minute break", () => {
      const flow = PRESETS["flow"]!;

      expect(flow.blocks).toHaveLength(2);
      expect(flow.blocks[0]!.duration).toBe(120);
      expect(flow.blocks[1]!.duration).toBe(30);
    });
  });

  describe("Quick Task preset", () => {
    it("should have exactly 1 block", () => {
      const qt = PRESETS["quickTask"]!;

      expect(qt.blocks).toHaveLength(1);
    });

    it("should be a 15-minute focus block with no break", () => {
      const qt = PRESETS["quickTask"]!;

      expect(qt.blocks[0]).toEqual({
        type: "focus",
        duration: 15,
        blockingEnabled: true,
      });
    });
  });

  describe("Marathon preset", () => {
    it("should have a 180-minute focus and 30-minute break", () => {
      const marathon = PRESETS["marathon"]!;

      expect(marathon.blocks).toHaveLength(2);
      expect(marathon.blocks[0]!.duration).toBe(180);
      expect(marathon.blocks[1]!.duration).toBe(30);
    });
  });

  describe("getPreset", () => {
    it("should return a preset by record key", () => {
      const result = getPreset("pomodoro");

      expect(result).toBeDefined();
      expect(result!.name).toBe("Pomodoro Classic");
    });

    it("should return a preset by its id field", () => {
      const result = getPreset("deep-work");

      expect(result).toBeDefined();
      expect(result!.name).toBe("Deep Work");
    });

    it("should return a preset by its id field for quick-task", () => {
      const result = getPreset("quick-task");

      expect(result).toBeDefined();
      expect(result!.name).toBe("Quick Task");
    });

    it("should return undefined for unknown id", () => {
      const result = getPreset("nonexistent");

      expect(result).toBeUndefined();
    });

    it("should return undefined for empty string", () => {
      const result = getPreset("");

      expect(result).toBeUndefined();
    });
  });

  describe("getAllPresets", () => {
    it("should return all 7 presets", () => {
      const all = getAllPresets();

      expect(all).toHaveLength(7);
    });

    it("should return an array of preset objects", () => {
      const all = getAllPresets();

      for (const preset of all) {
        expect(preset).toHaveProperty("id");
        expect(preset).toHaveProperty("name");
        expect(preset).toHaveProperty("blocks");
        expect(preset).toHaveProperty("isBuiltIn");
      }
    });

    it("should include all known presets", () => {
      const all = getAllPresets();
      const names = all.map((p) => p.name);

      expect(names).toContain("Pomodoro Classic");
      expect(names).toContain("Deep Work");
      expect(names).toContain("Sprint");
      expect(names).toContain("Study Session");
      expect(names).toContain("Flow State");
      expect(names).toContain("Quick Task");
      expect(names).toContain("Marathon");
    });
  });
});
