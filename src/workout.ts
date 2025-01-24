import {
  getLastFinishedWorkoutTime,
  getLastTimeExerciseOfGroupWasFinished,
} from "./activity_log";
import {
  ActivityLog,
  Exercise,
  ExerciseGroup,
  Settings,
  Workout,
  WorkoutTask,
} from "./model";
import {
  randomChoiceUniqueN,
  randomIntegerInRangeInclusive,
  shuffleArray,
  repeatToLength,
  getDaysDifference,
} from "./utils";

export function generateWorkout(settings: Settings, activityLog: ActivityLog) {
  const workout: Workout = {
    tasks: [],
  };

  const mainTasks = createMainTasksForWorkout(settings, activityLog);

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

function createMainTasksForWorkout(
  settings: Settings,
  activityLog: ActivityLog
) {
  const tasks: WorkoutTask[] = [];
  const activeGroups = settings.exerciseGroups.filter((g) =>
    shouldIncludeGroupInWorkout(settings, g, activityLog)
  );
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
      exercisesToUse.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
    } else {
      exercisesToUse = [...group.exercises];
      shuffleArray(exercisesToUse);
      exercisesToUse.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
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

export function shouldIncludeGroupInWorkout(
  settings: Settings,
  group: ExerciseGroup,
  activityLog: ActivityLog
) {
  if (!group.active) {
    return false;
  }
  const lastGroupTime = getLastTimeExerciseOfGroupWasFinished(
    activityLog,
    group
  );
  if (lastGroupTime !== null) {
    const lastWorkoutTime = getLastFinishedWorkoutTime(activityLog)!;
    const didWorkoutToday =
      getDaysDifference(lastWorkoutTime, new Date()) === 0;
    let daysSinceGroup = getDaysDifference(lastGroupTime, new Date());
    // Assume the workout is created for the next day if there was one today already.
    daysSinceGroup += didWorkoutToday ? 1 : 0;
    if (daysSinceGroup < settings.restDaysPerGroups) {
      return false;
    }
  }
  return true;
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

export function addSecondInWorkout(
  workout: Workout,
  settings: Settings,
  sayMessage: (message: string) => void
) {
  for (let task_i = 0; task_i < workout.tasks.length; task_i++) {
    const task = workout.tasks[task_i];
    if (task.currentSecond < task.duration) {
      task.currentSecond += 1;

      const currentTaskMessage = getMessageToSay(workout, task_i, settings);
      if (currentTaskMessage) {
        sayMessage(currentTaskMessage);
      }
      if (task.currentSecond === task.duration) {
        if (task_i < workout.tasks.length - 1) {
          const nextTaskMessage = getMessageToSay(
            workout,
            task_i + 1,
            settings
          );
          if (nextTaskMessage) {
            sayMessage(nextTaskMessage);
          }
        }
      }
      return;
    }
  }
  return;
}

export function getMessageToSay(
  workout: Workout,
  currentTaskIndex: number,
  settings: Settings
): string | null {
  const task = workout.tasks[currentTaskIndex];
  const nextTask =
    currentTaskIndex < workout.tasks.length - 1
      ? workout.tasks[currentTaskIndex + 1]
      : null;

  const secondsToGo = task.duration - task.currentSecond;

  const taskJustStarted = task.currentSecond === 0;
  const taskJustEnded = secondsToGo === 0;
  const fiveSecondsToGo = secondsToGo === 5;
  const halfwayThrough = task.currentSecond === Math.floor(task.duration / 2);

  const fiveSecondsToGoMessage = "5 seconds to go!";
  const halfwayThroughMessage = "Halfway through!";

  let nextTaskRepetitions = 0;
  for (let i = currentTaskIndex + 1; i < workout.tasks.length; i++) {
    if (nextTask?.name === workout.tasks[i].name) {
      nextTaskRepetitions++;
    } else {
      break;
    }
  }

  switch (task.type) {
    case "warmup": {
      if (taskJustStarted) {
        return `Starting with warmup!`;
      } else if (halfwayThrough) {
        return halfwayThroughMessage;
      } else if (fiveSecondsToGo) {
        return fiveSecondsToGoMessage;
      }
      break;
    }
    case "initial-preparation": {
      if (taskJustStarted && nextTask) {
        if (nextTaskRepetitions === 1) {
          return `Prepare ${nextTask.name}!`;
        } else {
          return `Prepare ${nextTaskRepetitions} sets of ${nextTask.name}!`;
        }
      } else if (fiveSecondsToGo) {
        return fiveSecondsToGoMessage;
      }
      break;
    }
    case "exercise": {
      if (taskJustStarted) {
        return `GO!`;
      } else if (
        task.currentSecond ===
        task.duration - settings.nextExerciseAnnouncementOffset
      ) {
        if (nextTask) {
          if (nextTask.name == task.name) {
            if (nextTaskRepetitions === 1) {
              return "Next up: [pause] Same exercise one more time!";
            } else {
              return `Next up: [pause] Same exercise ${nextTaskRepetitions} more times!`;
            }
          } else {
            if (nextTaskRepetitions === 1) {
              return `Next up: [pause] ${nextTask.name}!`;
            } else {
              return `Next up: [pause] ${nextTaskRepetitions} sets of ${nextTask.name}!`;
            }
          }
        }
      } else if (
        settings.nextExerciseAnnouncementOffset >= 25 &&
        task.currentSecond == task.duration - 15
      ) {
        return "15 seconds to go!";
      } else if (fiveSecondsToGo) {
        return fiveSecondsToGoMessage;
      }
      break;
    }
    case "cooldown": {
      if (taskJustStarted) {
        return `Go!`;
      } else if (halfwayThrough) {
        return halfwayThroughMessage;
      } else if (task.duration >= 90 && secondsToGo === 30) {
        return `30 seconds to go!`;
      } else if (fiveSecondsToGo) {
        return fiveSecondsToGoMessage;
      }
      break;
    }
  }

  if (nextTask === null && taskJustEnded) {
    return `DONE!`;
  }
  return null;
}
