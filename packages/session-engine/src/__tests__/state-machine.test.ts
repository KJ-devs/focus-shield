import { SessionStateMachine } from "../index";

describe("SessionStateMachine", () => {
  let machine: SessionStateMachine;

  beforeEach(() => {
    machine = new SessionStateMachine();
  });

  describe("constructor", () => {
    it("should start in idle state", () => {
      expect(machine.getState()).toBe("idle");
    });

    it("should start with block index 0", () => {
      expect(machine.getBlockIndex()).toBe(0);
    });

    it("should set totalBlocks to 0 when no blocks provided", () => {
      expect(machine.getTotalBlocks()).toBe(0);
    });

    it("should set totalBlocks from blocks parameter", () => {
      const blocks = [
        { type: "focus" as const, duration: 25, blockingEnabled: true },
        { type: "break" as const, duration: 5, blockingEnabled: false },
        { type: "focus" as const, duration: 25, blockingEnabled: true },
      ];

      const sm = new SessionStateMachine(blocks);

      expect(sm.getTotalBlocks()).toBe(3);
    });
  });

  describe("valid transitions", () => {
    it("should transition from idle to starting", () => {
      machine.transition("starting");

      expect(machine.getState()).toBe("starting");
    });

    it("should transition from idle to scheduled", () => {
      machine.transition("scheduled");

      expect(machine.getState()).toBe("scheduled");
    });

    it("should transition from scheduled to starting", () => {
      machine.transition("scheduled");

      machine.transition("starting");

      expect(machine.getState()).toBe("starting");
    });

    it("should transition from scheduled to idle", () => {
      machine.transition("scheduled");

      machine.transition("idle");

      expect(machine.getState()).toBe("idle");
    });

    it("should transition from starting to focus_active", () => {
      machine.transition("starting");

      machine.transition("focus_active");

      expect(machine.getState()).toBe("focus_active");
    });

    it("should transition from focus_active to break_transition", () => {
      machine.transition("starting");
      machine.transition("focus_active");

      machine.transition("break_transition");

      expect(machine.getState()).toBe("break_transition");
    });

    it("should transition from focus_active to paused", () => {
      machine.transition("starting");
      machine.transition("focus_active");

      machine.transition("paused");

      expect(machine.getState()).toBe("paused");
    });

    it("should transition from focus_active to unlock_requested", () => {
      machine.transition("starting");
      machine.transition("focus_active");

      machine.transition("unlock_requested");

      expect(machine.getState()).toBe("unlock_requested");
    });

    it("should transition from focus_active to completed", () => {
      machine.transition("starting");
      machine.transition("focus_active");

      machine.transition("completed");

      expect(machine.getState()).toBe("completed");
    });

    it("should transition from break_transition to break_active", () => {
      machine.transition("starting");
      machine.transition("focus_active");
      machine.transition("break_transition");

      machine.transition("break_active");

      expect(machine.getState()).toBe("break_active");
    });

    it("should transition from break_active to focus_transition", () => {
      machine.transition("starting");
      machine.transition("focus_active");
      machine.transition("break_transition");
      machine.transition("break_active");

      machine.transition("focus_transition");

      expect(machine.getState()).toBe("focus_transition");
    });

    it("should transition from focus_transition to focus_active", () => {
      machine.transition("starting");
      machine.transition("focus_active");
      machine.transition("break_transition");
      machine.transition("break_active");
      machine.transition("focus_transition");

      machine.transition("focus_active");

      expect(machine.getState()).toBe("focus_active");
    });

    it("should transition from paused to focus_active", () => {
      machine.transition("starting");
      machine.transition("focus_active");
      machine.transition("paused");

      machine.transition("focus_active");

      expect(machine.getState()).toBe("focus_active");
    });

    it("should transition from unlock_requested to cooldown_waiting", () => {
      machine.transition("starting");
      machine.transition("focus_active");
      machine.transition("unlock_requested");

      machine.transition("cooldown_waiting");

      expect(machine.getState()).toBe("cooldown_waiting");
    });

    it("should transition from unlock_requested to password_entry", () => {
      machine.transition("starting");
      machine.transition("focus_active");
      machine.transition("unlock_requested");

      machine.transition("password_entry");

      expect(machine.getState()).toBe("password_entry");
    });

    it("should transition from unlock_requested to focus_active", () => {
      machine.transition("starting");
      machine.transition("focus_active");
      machine.transition("unlock_requested");

      machine.transition("focus_active");

      expect(machine.getState()).toBe("focus_active");
    });

    it("should transition from cooldown_waiting to password_entry", () => {
      machine.transition("starting");
      machine.transition("focus_active");
      machine.transition("unlock_requested");
      machine.transition("cooldown_waiting");

      machine.transition("password_entry");

      expect(machine.getState()).toBe("password_entry");
    });

    it("should transition from password_entry to unlock_failed", () => {
      machine.transition("starting");
      machine.transition("focus_active");
      machine.transition("unlock_requested");
      machine.transition("password_entry");

      machine.transition("unlock_failed");

      expect(machine.getState()).toBe("unlock_failed");
    });

    it("should transition from password_entry to unlocked", () => {
      machine.transition("starting");
      machine.transition("focus_active");
      machine.transition("unlock_requested");
      machine.transition("password_entry");

      machine.transition("unlocked");

      expect(machine.getState()).toBe("unlocked");
    });

    it("should transition from unlock_failed to focus_active", () => {
      machine.transition("starting");
      machine.transition("focus_active");
      machine.transition("unlock_requested");
      machine.transition("password_entry");
      machine.transition("unlock_failed");

      machine.transition("focus_active");

      expect(machine.getState()).toBe("focus_active");
    });

    it("should transition from unlocked to completed", () => {
      machine.transition("starting");
      machine.transition("focus_active");
      machine.transition("unlock_requested");
      machine.transition("password_entry");
      machine.transition("unlocked");

      machine.transition("completed");

      expect(machine.getState()).toBe("completed");
    });

    it("should transition from unlocked to review", () => {
      machine.transition("starting");
      machine.transition("focus_active");
      machine.transition("unlock_requested");
      machine.transition("password_entry");
      machine.transition("unlocked");

      machine.transition("review");

      expect(machine.getState()).toBe("review");
    });

    it("should transition from completed to review", () => {
      machine.transition("starting");
      machine.transition("focus_active");
      machine.transition("completed");

      machine.transition("review");

      expect(machine.getState()).toBe("review");
    });

    it("should transition from review to idle", () => {
      machine.transition("starting");
      machine.transition("focus_active");
      machine.transition("completed");
      machine.transition("review");

      machine.transition("idle");

      expect(machine.getState()).toBe("idle");
    });
  });

  describe("invalid transitions", () => {
    it("should throw when transitioning from idle to completed", () => {
      expect(() => machine.transition("completed")).toThrow(
        'Invalid transition: cannot go from "idle" to "completed"',
      );
    });

    it("should throw when transitioning from idle to focus_active", () => {
      expect(() => machine.transition("focus_active")).toThrow(
        'Invalid transition: cannot go from "idle" to "focus_active"',
      );
    });

    it("should throw when transitioning from starting to break_active", () => {
      machine.transition("starting");

      expect(() => machine.transition("break_active")).toThrow(
        'Invalid transition: cannot go from "starting" to "break_active"',
      );
    });

    it("should throw when transitioning from focus_active to idle", () => {
      machine.transition("starting");
      machine.transition("focus_active");

      expect(() => machine.transition("idle")).toThrow(
        'Invalid transition: cannot go from "focus_active" to "idle"',
      );
    });

    it("should throw when transitioning from break_active to completed", () => {
      machine.transition("starting");
      machine.transition("focus_active");
      machine.transition("break_transition");
      machine.transition("break_active");

      expect(() => machine.transition("completed")).toThrow(
        'Invalid transition: cannot go from "break_active" to "completed"',
      );
    });

    it("should throw when transitioning from completed to focus_active", () => {
      machine.transition("starting");
      machine.transition("focus_active");
      machine.transition("completed");

      expect(() => machine.transition("focus_active")).toThrow(
        'Invalid transition: cannot go from "completed" to "focus_active"',
      );
    });

    it("should throw when transitioning from paused to idle", () => {
      machine.transition("starting");
      machine.transition("focus_active");
      machine.transition("paused");

      expect(() => machine.transition("idle")).toThrow(
        'Invalid transition: cannot go from "paused" to "idle"',
      );
    });

    it("should throw when transitioning from review to completed", () => {
      machine.transition("starting");
      machine.transition("focus_active");
      machine.transition("completed");
      machine.transition("review");

      expect(() => machine.transition("completed")).toThrow(
        'Invalid transition: cannot go from "review" to "completed"',
      );
    });
  });

  describe("canTransition", () => {
    it("should return true for valid transitions from idle", () => {
      expect(machine.canTransition("starting")).toBe(true);
      expect(machine.canTransition("scheduled")).toBe(true);
    });

    it("should return false for invalid transitions from idle", () => {
      expect(machine.canTransition("completed")).toBe(false);
      expect(machine.canTransition("focus_active")).toBe(false);
      expect(machine.canTransition("break_active")).toBe(false);
      expect(machine.canTransition("paused")).toBe(false);
    });

    it("should return true for valid transitions from focus_active", () => {
      machine.transition("starting");
      machine.transition("focus_active");

      expect(machine.canTransition("break_transition")).toBe(true);
      expect(machine.canTransition("paused")).toBe(true);
      expect(machine.canTransition("unlock_requested")).toBe(true);
      expect(machine.canTransition("completed")).toBe(true);
    });

    it("should return false for invalid transitions from focus_active", () => {
      machine.transition("starting");
      machine.transition("focus_active");

      expect(machine.canTransition("idle")).toBe(false);
      expect(machine.canTransition("starting")).toBe(false);
      expect(machine.canTransition("break_active")).toBe(false);
    });
  });

  describe("block index tracking", () => {
    it("should increment block index on focus_transition to focus_active", () => {
      const blocks = [
        { type: "focus" as const, duration: 25, blockingEnabled: true },
        { type: "break" as const, duration: 5, blockingEnabled: false },
        { type: "focus" as const, duration: 25, blockingEnabled: true },
      ];
      const sm = new SessionStateMachine(blocks);

      sm.transition("starting");
      sm.transition("focus_active");
      expect(sm.getBlockIndex()).toBe(0);

      sm.transition("break_transition");
      sm.transition("break_active");
      expect(sm.getBlockIndex()).toBe(1);

      sm.transition("focus_transition");
      sm.transition("focus_active");
      expect(sm.getBlockIndex()).toBe(2);
    });

    it("should increment block index on break_transition to break_active", () => {
      const blocks = [
        { type: "focus" as const, duration: 25, blockingEnabled: true },
        { type: "break" as const, duration: 5, blockingEnabled: false },
      ];
      const sm = new SessionStateMachine(blocks);

      sm.transition("starting");
      sm.transition("focus_active");
      expect(sm.getBlockIndex()).toBe(0);

      sm.transition("break_transition");
      sm.transition("break_active");
      expect(sm.getBlockIndex()).toBe(1);
    });

    it("should not increment block index beyond totalBlocks - 1", () => {
      const blocks = [
        { type: "focus" as const, duration: 25, blockingEnabled: true },
        { type: "break" as const, duration: 5, blockingEnabled: false },
      ];
      const sm = new SessionStateMachine(blocks);

      sm.transition("starting");
      sm.transition("focus_active");
      sm.transition("break_transition");
      sm.transition("break_active");
      expect(sm.getBlockIndex()).toBe(1);

      // Even cycling further should not go beyond totalBlocks - 1
      sm.transition("focus_transition");
      sm.transition("focus_active");
      expect(sm.getBlockIndex()).toBe(1);
    });

    it("should not increment on other transitions", () => {
      const blocks = [
        { type: "focus" as const, duration: 25, blockingEnabled: true },
        { type: "break" as const, duration: 5, blockingEnabled: false },
      ];
      const sm = new SessionStateMachine(blocks);

      sm.transition("starting");
      expect(sm.getBlockIndex()).toBe(0);

      sm.transition("focus_active");
      expect(sm.getBlockIndex()).toBe(0);

      sm.transition("paused");
      expect(sm.getBlockIndex()).toBe(0);

      sm.transition("focus_active");
      expect(sm.getBlockIndex()).toBe(0);
    });

    it("should not increment when no blocks provided", () => {
      const sm = new SessionStateMachine();

      sm.transition("starting");
      sm.transition("focus_active");
      sm.transition("break_transition");
      sm.transition("break_active");

      expect(sm.getBlockIndex()).toBe(0);
    });
  });

  describe("event listeners", () => {
    it("should notify listeners on state change", () => {
      const listener = vi.fn();
      machine.onStateChange(listener);

      machine.transition("starting");

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "idle",
          to: "starting",
          blockIndex: 0,
          timestamp: expect.any(Date),
        }),
      );
    });

    it("should notify multiple listeners", () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      machine.onStateChange(listener1);
      machine.onStateChange(listener2);

      machine.transition("starting");

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it("should notify on each transition", () => {
      const listener = vi.fn();
      machine.onStateChange(listener);

      machine.transition("starting");
      machine.transition("focus_active");

      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ from: "idle", to: "starting" }),
      );
      expect(listener).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ from: "starting", to: "focus_active" }),
      );
    });

    it("should unsubscribe listener when calling returned function", () => {
      const listener = vi.fn();
      const unsubscribe = machine.onStateChange(listener);

      machine.transition("starting");
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();

      machine.transition("focus_active");
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should not affect other listeners when one is unsubscribed", () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const unsub1 = machine.onStateChange(listener1);
      machine.onStateChange(listener2);

      unsub1();
      machine.transition("starting");

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it("should not notify listeners on failed transitions", () => {
      const listener = vi.fn();
      machine.onStateChange(listener);

      expect(() => machine.transition("completed")).toThrow();

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("reset", () => {
    it("should return to idle state", () => {
      machine.transition("starting");
      machine.transition("focus_active");

      machine.reset();

      expect(machine.getState()).toBe("idle");
    });

    it("should reset block index to 0", () => {
      const blocks = [
        { type: "focus" as const, duration: 25, blockingEnabled: true },
        { type: "break" as const, duration: 5, blockingEnabled: false },
        { type: "focus" as const, duration: 25, blockingEnabled: true },
      ];
      const sm = new SessionStateMachine(blocks);

      sm.transition("starting");
      sm.transition("focus_active");
      sm.transition("break_transition");
      sm.transition("break_active");
      expect(sm.getBlockIndex()).toBe(1);

      sm.reset();

      expect(sm.getBlockIndex()).toBe(0);
    });

    it("should allow normal transitions after reset", () => {
      machine.transition("starting");
      machine.transition("focus_active");
      machine.transition("completed");

      machine.reset();

      expect(() => machine.transition("starting")).not.toThrow();
      expect(machine.getState()).toBe("starting");
    });
  });

  describe("full session lifecycle", () => {
    it("should complete a full pomodoro cycle", () => {
      const blocks = [
        { type: "focus" as const, duration: 25, blockingEnabled: true },
        { type: "break" as const, duration: 5, blockingEnabled: false },
        { type: "focus" as const, duration: 25, blockingEnabled: true },
        { type: "break" as const, duration: 5, blockingEnabled: false },
      ];
      const sm = new SessionStateMachine(blocks);

      sm.transition("starting");
      sm.transition("focus_active");
      // Block 0: focus

      sm.transition("break_transition");
      sm.transition("break_active");
      // Block 1: break

      sm.transition("focus_transition");
      sm.transition("focus_active");
      // Block 2: focus

      sm.transition("break_transition");
      sm.transition("break_active");
      // Block 3: break

      sm.transition("focus_transition");
      sm.transition("focus_active");
      // Block index stays at 3 (max)

      sm.transition("completed");
      sm.transition("review");
      sm.transition("idle");

      expect(sm.getState()).toBe("idle");
      expect(sm.getBlockIndex()).toBe(3);
    });

    it("should complete an unlock flow", () => {
      machine.transition("starting");
      machine.transition("focus_active");
      machine.transition("unlock_requested");
      machine.transition("cooldown_waiting");
      machine.transition("password_entry");
      machine.transition("unlocked");
      machine.transition("completed");
      machine.transition("review");
      machine.transition("idle");

      expect(machine.getState()).toBe("idle");
    });

    it("should handle failed unlock returning to focus", () => {
      machine.transition("starting");
      machine.transition("focus_active");
      machine.transition("unlock_requested");
      machine.transition("password_entry");
      machine.transition("unlock_failed");
      machine.transition("focus_active");

      expect(machine.getState()).toBe("focus_active");
    });
  });
});
