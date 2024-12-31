import { settingsLocalStorageKey, workoutLocalStorageKey } from "./model";

function versioningSettings() {
  const settings_json = localStorage.getItem(settingsLocalStorageKey);
  if (settings_json === null) {
    return;
  }
  const settings = JSON.parse(settings_json);
  for (const group of settings.exerciseGroups) {
    if (group.active === undefined) {
      group.active = true;
    }
  }
  if (settings.firstExercisePreparationDuration === undefined) {
    settings.firstExercisePreparationDuration = 0;
  }
  if (settings.version === undefined) {
    settings.version = 1;
  }
  if (settings.minSetRepetitions === undefined) {
    settings.minSetRepetitions = 2;
  }
  if (settings.maxSetRepetitions === undefined) {
    settings.maxSetRepetitions = 3;
  }
  if (settings.nextExerciseAnnouncementOffset === undefined) {
    settings.nextExerciseAnnouncementOffset = 30;
  }
  for (const group of settings.exerciseGroups) {
    for (const exercise of group.exercises) {
      exercise.durationOverride = "+0";
    }
  }
  if (settings.showExtraSettings === undefined) {
    settings.showExtraSettings = false;
  }
  localStorage.setItem(settingsLocalStorageKey, JSON.stringify(settings));
}

function versioningWorkout() {
  const workout_json = localStorage.getItem(workoutLocalStorageKey);
  if (workout_json === null) {
    return;
  }
  const workout = JSON.parse(workout_json);
  for (const task of workout.tasks) {
    if (task.type === undefined) {
      task.type = "exercise";
    }
  }
  localStorage.setItem(workoutLocalStorageKey, JSON.stringify(workout));
}

export function do_versioning() {
  versioningSettings();
  versioningWorkout();
}
