import { ActivityLog, ExerciseGroup, Workout } from "./model";

export function updateActivityLogAfterFinishedWorkout(
  activityLog: ActivityLog,
  workout: Workout
) {
  const currentTime = new Date().getTime();
  for (const task of workout.tasks) {
    if (task.type !== "exercise") {
      continue;
    }
    const exerciseLog = activityLog.exercises.find(
      (exerciseLog) => exerciseLog.name === task.name
    );
    if (exerciseLog) {
      exerciseLog.lastFinished = currentTime;
    } else {
      activityLog.exercises.push({
        name: task.name,
        lastFinished: currentTime,
      });
    }
  }
}

export function getLastTimeExerciseOfGroupWasFinished(
  activityLog: ActivityLog,
  group: ExerciseGroup
): null | Date {
  const exerciseNames = new Set<string>(group.exercises.map((e) => e.name));
  const exerciseLogs = activityLog.exercises.filter((e) =>
    exerciseNames.has(e.name)
  );
  if (exerciseLogs.length === 0) {
    return null;
  }
  const lastFinished = Math.max(...exerciseLogs.map((e) => e.lastFinished));
  return new Date(lastFinished);
}

export function getLastFinishedWorkoutTime(
  activityLog: ActivityLog
): null | Date {
  if (activityLog.exercises.length === 0) {
    return null;
  }
  const lastFinished = Math.max(
    ...activityLog.exercises.map((e) => e.lastFinished)
  );
  return new Date(lastFinished);
}
