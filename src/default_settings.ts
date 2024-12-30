import { Settings } from "./Model";

export const defaultSettings: Settings = {
  exerciseGroups: [
    {
      identifier: "471325219350607",
      name: "Shoulder",
      active: true,
      exercises: [
        { identifier: "0951374373098468", name: "Dumbbell Shoulder Press" },
        { identifier: "689689256478925", name: "Dumbbell Lateral Raise" },
        {
          identifier: "9804208661246041",
          name: 'Dumbbell Incline "W" Raise',
        },
      ],
    },
    {
      identifier: "021603711432107486",
      name: "Chest",
      active: true,
      exercises: [
        { identifier: "1679728276225425", name: "Dumbbell Incline Fly" },
        {
          identifier: "13618314841624435",
          name: "Dumbbell Incline Bench Press",
        },
      ],
    },
    {
      identifier: "7536856872851345",
      name: "Back",
      active: true,
      exercises: [
        { identifier: "5357330343846376", name: "Dumbbell Lying Row" },
        { identifier: "4815409418991401", name: "Dumbbell Bent-Over Row" },
      ],
    },
    {
      identifier: "18759021274689824",
      name: "Arms",
      active: true,
      exercises: [
        { identifier: "5326896622388075", name: "Barbell Curl" },
        { identifier: "4260281125530243", name: "Dumbbell Curl" },
        { identifier: "3601870208425586", name: "Bench Dip" },
        {
          identifier: "9668352336875743",
          name: "Barbell Lying Tricep Extension",
        },
        {
          identifier: "20217556900415556",
          name: "Dumbbell Concentration Curl",
        },
      ],
    },
    {
      identifier: "10865579525849367",
      name: "Abs",
      active: true,
      exercises: [
        { identifier: "029173396249283057", name: "Lying Leg-Hip Raise" },
        { identifier: "2613053955280098", name: "Weighted Crunch" },
      ],
    },
  ],
  warmupDuration: 60,
  cooldownDuration: 120,
  defaultTaskDuration: 100,
  minSetsPerGroup: 4,
  maxSetsPerGroup: 7,
  groupsPerWorkout: 2,
  firstExercisePreparationDuration: 20,
  minSetRepetitions: 2,
  maxSetRepetitions: 3,
  nextExerciseAnnouncementOffset: 40,
  version: 1,
};