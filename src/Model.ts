export interface Settings {
  version: number;
  exerciseGroups: ExerciseGroup[];
  warmupDuration: number;
  cooldownDuration: number;
  defaultTaskDuration: number;
  firstExercisePreparationDuration: number;
  groupsPerWorkout: number;
  minSetsPerGroup: number;
  maxSetsPerGroup: number;
  minSetRepetitions: number;
  maxSetRepetitions: number;
  nextExerciseAnnouncementOffset: number;
}

export interface ExerciseGroup {
  identifier: string;
  name: string;
  exercises: Exercise[];
  active: boolean;
}

export interface Exercise {
  identifier: string;
  name: string;
}

export interface Workout {
  tasks: WorkoutTask[];
}

export interface WorkoutTask {
  name: string;
  duration: number;
  currentSecond: number;
  type: WorkoutTaskTypeString;
}

export type WorkoutTaskTypeString =
  | "warmup"
  | "initial-preparation"
  | "exercise"
  | "cooldown";
