import { createContext, useContext, useEffect } from "react";
import {
  useActivityLog,
  useCurrentWorkout,
  useSettings,
} from "./local_storage";
import { WorkoutTask } from "./model";
import { ensureWakeLock, ensureNoWakeLock } from "./wake_lock";
import {
  workoutHasBegan,
  workoutHasEnded,
  getTotalWorkoutTime,
  getRemainingWorkoutTime,
  saySomethingIfNecessary,
  generateWorkout,
  addSecondInWorkout,
} from "./workout";
import {
  getLastFinishedWorkoutTime,
  updateActivityLogAfterFinishedWorkout,
} from "./activity_log";
import { getStringForLastTime } from "./utils";

export function WorkoutTab() {
  return (
    <>
      <WorkoutControlButtons />
      <LastFinishedWorkoutLabel />
      <WorkoutList />
    </>
  );
}

function WorkoutControlButtons() {
  return (
    <>
      <div className="flex justify-between px-2 text-sky-50">
        <NewWorkoutButton />
        <StartPauseButton />
        <ResetWorkoutButton />
      </div>
    </>
  );
}

interface IsPlayingState {
  isPlaying: boolean;
  setIsPlaying: (isPlaying: boolean) => void;
}

export const IsPlayingContext = createContext<IsPlayingState>({
  isPlaying: false,
  setIsPlaying: () => {},
});

function StartPauseButton() {
  const [workout] = useCurrentWorkout();
  const [settings] = useSettings();
  const { isPlaying, setIsPlaying } = useContext(IsPlayingContext);
  const hasBegan = workoutHasBegan(workout);
  const hasEnded = workoutHasEnded(workout);

  const totalTime = getTotalWorkoutTime(workout);
  const remainingTime = getRemainingWorkoutTime(workout);

  function toggleIsPlaying() {
    if (hasEnded) {
      return;
    }
    const newPlayingState = !isPlaying;
    setIsPlaying(newPlayingState);
    if (newPlayingState && !hasBegan) {
      saySomethingIfNecessary(workout, 0, settings);
    }
  }

  return (
    <div
      onClick={toggleIsPlaying}
      className={`py-2 w-full mx-2 rounded transition duration-300 text-center select-none ${
        hasEnded
          ? "bg-gray-600"
          : "bg-gray-800 hover:bg-gray-900 cursor-pointer"
      }`}
    >
      {isPlaying
        ? `Pause (${secondsToTimeString(remainingTime)})`
        : hasBegan
        ? hasEnded
          ? `Done (${secondsToTimeString(totalTime)})`
          : `Continue (${secondsToTimeString(remainingTime)})`
        : `Start (${secondsToTimeString(totalTime)})`}
    </div>
  );
}

function LastFinishedWorkoutLabel() {
  const [activityLog] = useActivityLog();

  const lastWorkoutTime = getLastFinishedWorkoutTime(activityLog);
  const lastWorkoutText = getStringForLastTime(lastWorkoutTime, new Date());

  return (
    <div className="text-gray-200 text-sm m-2 text-center">
      {`Last Finished: ${lastWorkoutText}`}
    </div>
  );
}

function ResetWorkoutButton() {
  const [currentWorkout, setCurrentWorkout] = useCurrentWorkout();
  const { setIsPlaying } = useContext(IsPlayingContext);

  function resetWorkout() {
    for (const task of currentWorkout.tasks) {
      task.currentSecond = 0;
    }
    setCurrentWorkout(currentWorkout);
    setIsPlaying(false);
  }

  return (
    <div
      onClick={resetWorkout}
      className="cursor-pointer bg-gray-800 py-2 px-4 rounded hover:bg-gray-900 transition duration-300 select-none"
    >
      Reset
    </div>
  );
}

function NewWorkoutButton() {
  const [settings] = useSettings();
  const [_, setCurrentWorkout] = useCurrentWorkout();
  const { setIsPlaying } = useContext(IsPlayingContext);

  function updateWorkout() {
    setCurrentWorkout(generateWorkout(settings));
    setIsPlaying(false);
  }

  return (
    <div
      onClick={updateWorkout}
      className="cursor-pointer bg-gray-800 py-2 px-4 rounded hover:bg-gray-900 transition duration-300 select-none"
    >
      New
    </div>
  );
}

function WorkoutList() {
  const [settings] = useSettings();
  const [activityLog, setActivityLog] = useActivityLog();
  const [currentWorkout, setCurrentWorkout] = useCurrentWorkout();
  const { isPlaying, setIsPlaying } = useContext(IsPlayingContext);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }
    let interval = setInterval(() => {
      addSecondInWorkout(currentWorkout, settings);
      setCurrentWorkout(currentWorkout);
      if (workoutHasEnded(currentWorkout)) {
        setIsPlaying(false);
        updateActivityLogAfterFinishedWorkout(activityLog, currentWorkout);
        setActivityLog(activityLog);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  if (isPlaying) {
    ensureWakeLock();
  } else {
    ensureNoWakeLock();
  }

  return (
    <div className="my-2 border-b-2 border-sky-800">
      {currentWorkout.tasks.map((task, i) => (
        <WorkoutTaskRow key={i} task={task} />
      ))}
    </div>
  );
}

function WorkoutTaskRow({ task }: { task: WorkoutTask }) {
  const remainingSeconds = task.duration - task.currentSecond;
  const progressText = remainingSeconds === 0 ? "Done" : `${remainingSeconds}s`;
  return (
    <div className="w-full h-8 relative border-t-2 border-sky-800 select-none">
      <div
        className="absolute h-full bg-lime-600 transition-all duration-300"
        style={{ width: `${(task.currentSecond / task.duration) * 100}%` }}
      >
        <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-white font-bold whitespace-nowrap">
          {task.name}
        </span>
      </div>
      <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white">
        {progressText}
      </span>
    </div>
  );
}

function secondsToTimeString(seconds: number) {
  seconds = Math.floor(seconds);
  const minutes = Math.floor(seconds / 60);
  const secondsNum = seconds % 60;
  return `${minutes}:${secondsNum < 10 ? "0" : ""}${secondsNum}`;
}
