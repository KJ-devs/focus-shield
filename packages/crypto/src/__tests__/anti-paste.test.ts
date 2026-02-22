import { AntiPasteValidator } from "../anti-paste";
import type { InputEvent } from "../anti-paste";

describe("AntiPasteValidator", () => {
  describe("isEventSuspicious", () => {
    it("paste events are suspicious when paste is NOT allowed", () => {
      const validator = new AntiPasteValidator(false);
      const event: InputEvent = { type: "paste", timestamp: 1000 };
      expect(validator.isEventSuspicious(event)).toBe(true);
    });

    it("paste events are NOT suspicious when paste is allowed", () => {
      const validator = new AntiPasteValidator(true);
      const event: InputEvent = { type: "paste", timestamp: 1000 };
      expect(validator.isEventSuspicious(event)).toBe(false);
    });

    it("drop events are always suspicious", () => {
      const validatorNoPasste = new AntiPasteValidator(false);
      const validatorPaste = new AntiPasteValidator(true);
      const event: InputEvent = { type: "drop", timestamp: 1000 };

      expect(validatorNoPasste.isEventSuspicious(event)).toBe(true);
      expect(validatorPaste.isEventSuspicious(event)).toBe(true);
    });

    it("insertFromPaste inputType is suspicious when paste not allowed", () => {
      const validator = new AntiPasteValidator(false);
      const event: InputEvent = {
        type: "input",
        timestamp: 1000,
        inputType: "insertFromPaste",
      };
      expect(validator.isEventSuspicious(event)).toBe(true);
    });

    it("insertFromPaste inputType is NOT suspicious when paste is allowed", () => {
      const validator = new AntiPasteValidator(true);
      const event: InputEvent = {
        type: "input",
        timestamp: 1000,
        inputType: "insertFromPaste",
      };
      expect(validator.isEventSuspicious(event)).toBe(false);
    });

    it("insertFromDrop inputType is always suspicious", () => {
      const validator = new AntiPasteValidator(true);
      const event: InputEvent = {
        type: "input",
        timestamp: 1000,
        inputType: "insertFromDrop",
      };
      expect(validator.isEventSuspicious(event)).toBe(true);
    });

    it("normal keydown events are not suspicious", () => {
      const validator = new AntiPasteValidator(false);
      const event: InputEvent = {
        type: "keydown",
        timestamp: 1000,
        key: "a",
      };
      expect(validator.isEventSuspicious(event)).toBe(false);
    });

    it("normal input events with insertText type are not suspicious", () => {
      const validator = new AntiPasteValidator(false);
      const event: InputEvent = {
        type: "input",
        timestamp: 1000,
        inputType: "insertText",
      };
      expect(validator.isEventSuspicious(event)).toBe(false);
    });
  });

  describe("validate", () => {
    it("returns invalid for paste when paste is not allowed", () => {
      const validator = new AntiPasteValidator(false);
      validator.recordEvent({ type: "keydown", timestamp: 100, key: "a" });
      validator.recordEvent({ type: "paste", timestamp: 200 });

      const result = validator.validate();
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain("Paste detected");
    });

    it("returns valid for paste when paste is allowed", () => {
      const validator = new AntiPasteValidator(true);
      validator.recordEvent({ type: "keydown", timestamp: 100, key: "a" });
      validator.recordEvent({ type: "paste", timestamp: 200 });

      const result = validator.validate();
      expect(result.isValid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("returns valid for normal keydown events only", () => {
      const validator = new AntiPasteValidator(false);
      // Simulate typing with natural variance (not enough keys for auto-type detection)
      validator.recordEvent({ type: "keydown", timestamp: 100, key: "a" });
      validator.recordEvent({ type: "keydown", timestamp: 250, key: "b" });
      validator.recordEvent({ type: "keydown", timestamp: 380, key: "c" });

      const result = validator.validate();
      expect(result.isValid).toBe(true);
    });

    it("returns invalid for drop events", () => {
      const validator = new AntiPasteValidator(false);
      validator.recordEvent({ type: "drop", timestamp: 100 });

      const result = validator.validate();
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain("Drop detected");
    });

    it("returns invalid for insertFromPaste input type when paste not allowed", () => {
      const validator = new AntiPasteValidator(false);
      validator.recordEvent({
        type: "input",
        timestamp: 100,
        inputType: "insertFromPaste",
      });

      const result = validator.validate();
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain("Paste detected");
    });

    it("returns invalid for auto-typing patterns", () => {
      const validator = new AntiPasteValidator(false);
      // Simulate auto-typing: 12 keystrokes with almost perfectly consistent 100ms intervals
      for (let i = 0; i < 12; i++) {
        validator.recordEvent({
          type: "keydown",
          timestamp: 1000 + i * 100,
          key: "a",
        });
      }

      const result = validator.validate();
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain("Auto-typing detected");
    });
  });

  describe("detectAutoType", () => {
    it("detects suspiciously consistent timing (low variance)", () => {
      const validator = new AntiPasteValidator(false);
      // 12 keystrokes at perfectly consistent 50ms intervals = variance 0
      for (let i = 0; i < 12; i++) {
        validator.recordEvent({
          type: "keydown",
          timestamp: 1000 + i * 50,
          key: String.fromCharCode(97 + (i % 26)),
        });
      }

      expect(validator.detectAutoType()).toBe(true);
    });

    it("returns false for normal typing variance", () => {
      const validator = new AntiPasteValidator(false);
      // Simulate human typing with natural, high-variance intervals
      const timestamps = [
        100, 220, 380, 470, 620, 750, 950, 1020, 1200, 1350, 1550, 1700,
      ];
      for (let i = 0; i < timestamps.length; i++) {
        validator.recordEvent({
          type: "keydown",
          timestamp: timestamps[i] as number,
          key: String.fromCharCode(97 + (i % 26)),
        });
      }

      expect(validator.detectAutoType()).toBe(false);
    });

    it("returns false when fewer than 10 keystrokes", () => {
      const validator = new AntiPasteValidator(false);
      // Only 5 perfectly consistent keystrokes - below threshold
      for (let i = 0; i < 5; i++) {
        validator.recordEvent({
          type: "keydown",
          timestamp: 1000 + i * 50,
          key: "a",
        });
      }

      expect(validator.detectAutoType()).toBe(false);
    });

    it("ignores non-keydown events when checking for auto-type", () => {
      const validator = new AntiPasteValidator(true);
      // Mix keydown and input events - only keydown should be analyzed
      for (let i = 0; i < 5; i++) {
        validator.recordEvent({
          type: "keydown",
          timestamp: 1000 + i * 200,
          key: "a",
        });
        validator.recordEvent({
          type: "input",
          timestamp: 1000 + i * 200 + 5,
          inputType: "insertText",
        });
      }

      // Only 5 keydown events, below threshold of 10
      expect(validator.detectAutoType()).toBe(false);
    });
  });

  describe("reset", () => {
    it("clears all recorded events", () => {
      const validator = new AntiPasteValidator(false);
      validator.recordEvent({ type: "keydown", timestamp: 100, key: "a" });
      validator.recordEvent({ type: "paste", timestamp: 200 });

      expect(validator.getEvents()).toHaveLength(2);

      validator.reset();

      expect(validator.getEvents()).toHaveLength(0);
    });

    it("validate returns valid after reset even if previously invalid", () => {
      const validator = new AntiPasteValidator(false);
      validator.recordEvent({ type: "paste", timestamp: 200 });

      expect(validator.validate().isValid).toBe(false);

      validator.reset();

      expect(validator.validate().isValid).toBe(true);
    });
  });

  describe("getEvents", () => {
    it("returns a copy of all recorded events", () => {
      const validator = new AntiPasteValidator(false);
      const event1: InputEvent = { type: "keydown", timestamp: 100, key: "a" };
      const event2: InputEvent = { type: "keydown", timestamp: 200, key: "b" };

      validator.recordEvent(event1);
      validator.recordEvent(event2);

      const events = validator.getEvents();
      expect(events).toHaveLength(2);
      expect(events[0]).toEqual(event1);
      expect(events[1]).toEqual(event2);
    });
  });
});
