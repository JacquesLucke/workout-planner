import { Workout } from "./Model";

export const defaultWorkout: Workout = {
  tasks: [
    { name: "Warmup", duration: 60, currentSecond: 0, type: "warmup" },
    {
      name: "Cooldown",
      duration: 120,
      currentSecond: 0,
      type: "cooldown",
    },
  ],
};
