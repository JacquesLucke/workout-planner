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
  showExtraSettings: boolean;
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
  durationOverride: string;
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

export interface ActivityLog {
  exercises: ExerciseLog[];
}

export interface ExerciseLog {
  name: string;
  lastFinished: number;
}

export const settingsLocalStorageKey = "settings";
export const workoutLocalStorageKey = "currentWorkout";
export const activityLogLocalStorageKey = "activityLog";
