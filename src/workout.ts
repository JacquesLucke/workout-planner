import { Exercise, Settings, Workout, WorkoutTask } from "./model";
import {
  randomChoiceUniqueN,
  randomIntegerInRangeInclusive,
  shuffleArray,
  repeatToLength,
} from "./utils";

export function generateWorkout(settings: Settings) {
  const workout: Workout = {
    tasks: [],
  };

  const mainTasks = createMainTasksForWorkout(settings);

  if (settings.warmupDuration > 0) {
    workout.tasks.push({
      name: "Warmup",
      duration: settings.warmupDuration,
      currentSecond: 0,
      type: "warmup",
    });
  }

  let firstExercisePreparationTask: WorkoutTask | null = null;
  if (settings.firstExercisePreparationDuration > 0 && mainTasks.length > 0) {
    firstExercisePreparationTask = {
      name: "Prepare " + mainTasks[0].name,
      duration: settings.firstExercisePreparationDuration,
      currentSecond: 0,
      type: "initial-preparation",
    };
    workout.tasks.push(firstExercisePreparationTask);
  }

  workout.tasks.push(...mainTasks);

  if (settings.cooldownDuration > 0) {
    workout.tasks.push({
      name: "Cooldown",
      duration: settings.cooldownDuration,
      currentSecond: 0,
      type: "cooldown",
    });
  }

  return workout;
}

function createMainTasksForWorkout(settings: Settings) {
  const tasks: WorkoutTask[] = [];
  const activeGroups = settings.exerciseGroups.filter((g) => g.active);
  const groups = randomChoiceUniqueN(activeGroups, settings.groupsPerWorkout);
  for (const group of groups) {
    const setsInGroup = randomIntegerInRangeInclusive(
      settings.minSetsPerGroup,
      settings.maxSetsPerGroup
    );
    const setDistribution = getWorkoutGroupSetDistribution(
      setsInGroup,
      settings
    );
    let exercisesToUse;
    if (setDistribution.length <= group.exercises.length) {
      exercisesToUse = randomChoiceUniqueN(
        group.exercises,
        setDistribution.length
      );
    } else {
      exercisesToUse = [...group.exercises];
      shuffleArray(exercisesToUse);
      exercisesToUse = repeatToLength(exercisesToUse, setDistribution.length);
    }

    for (let i = 0; i < setDistribution.length; i++) {
      const exercise = exercisesToUse[i];
      const setsNum = setDistribution[i];
      for (let j = 0; j < setsNum; j++) {
        const duration = getOverriddenExerciseDuration(
          exercise,
          settings
        ).duration;
        tasks.push({
          name: exercise.name,
          duration,
          currentSecond: 0,
          type: "exercise",
        });
      }
    }
  }

  return tasks;
}

function getWorkoutGroupSetDistribution(setsNum: number, settings: Settings) {
  let remainingAttempts = 100;
  while (true) {
    let count = 0;
    let result = [];
    while (count < setsNum) {
      const nextNum = randomIntegerInRangeInclusive(
        settings.minSetRepetitions,
        settings.maxSetRepetitions
      );
      result.push(nextNum);
      count += nextNum;
    }
    if (remainingAttempts === 0) {
      result[result.length - 1] -= count - setsNum;
      return result;
    }
    if (count === setsNum) {
      return result;
    }
    remainingAttempts -= 1;
  }
}

export function workoutHasBegan(workout: Workout) {
  for (const task of workout.tasks) {
    if (task.currentSecond > 0) {
      return true;
    }
  }
  return false;
}

export function workoutHasEnded(workout: Workout) {
  for (const task of workout.tasks) {
    if (task.currentSecond < task.duration) {
      return false;
    }
  }
  return true;
}

export function getRemainingWorkoutTime(workout: Workout) {
  let time = 0;
  for (const task of workout.tasks) {
    time += task.duration - task.currentSecond;
  }
  return time;
}

export function getTotalWorkoutTime(workout: Workout) {
  let time = 0;
  for (const task of workout.tasks) {
    time += task.duration;
  }
  return time;
}

interface ExerciseDurationResult {
  duration: number;
  overrideIsValid: boolean;
}

export function getOverriddenExerciseDuration(
  exercise: Exercise,
  settings: Settings
): ExerciseDurationResult {
  if (/^[+-]\d+$/.test(exercise.durationOverride)) {
    const offset = parseInt(exercise.durationOverride);
    return {
      duration: Math.max(1, settings.defaultTaskDuration + offset),
      overrideIsValid: true,
    };
  }
  if (/^\d+$/.test(exercise.durationOverride)) {
    return {
      duration: Math.max(1, parseInt(exercise.durationOverride)),
      overrideIsValid: true,
    };
  }
  if (/^x\d+$/.test(exercise.durationOverride)) {
    const multiplier = parseInt(exercise.durationOverride.substring(1));
    return {
      duration: Math.max(1, settings.defaultTaskDuration * multiplier),
      overrideIsValid: true,
    };
  }
  return {
    duration: Math.max(1, settings.defaultTaskDuration),
    overrideIsValid: false,
  };
}
