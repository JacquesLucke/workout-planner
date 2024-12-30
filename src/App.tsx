import { useState, useEffect, useContext, createContext, useRef } from "react";
import useLocalStorageState, {
  LocalStorageState,
} from "use-local-storage-state";
import { defaultSettings } from "./default_settings";
import { defaultWorkout } from "./default_workout";
import {
  Settings,
  ExerciseGroup,
  Exercise,
  Workout,
  WorkoutTask,
} from "./Model";

interface IsPlayingState {
  isPlaying: boolean;
  setIsPlaying: (isPlaying: boolean) => void;
}

const IsPlayingContext = createContext<IsPlayingState>({
  isPlaying: false,
  setIsPlaying: () => {},
});

let wakeLock: WakeLockSentinel | null = null;

function App() {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <>
      <IsPlayingContext.Provider value={{ isPlaying, setIsPlaying }}>
        <Tabs />
        <CurrentTab />
      </IsPlayingContext.Provider>
    </>
  );
}

function Tabs() {
  const [currentTab, setCurrentTab] = useCurrentTab();

  const tabNames = ["Workout", "Settings"];
  const tabIdentifiers = ["workout", "settings"];

  return (
    <nav className="flex justify-center items-center p-2 shadow-md shadow-gray-800 bg-sky-900 mb-2">
      {tabNames.map((name, i) => (
        <div
          key={name}
          className={`flex justify-center items-center shadow-md px-4 py-2 mx-4 rounded bg-gray-800 hover:bg-gray-900 transition duration-300 cursor-pointer select-none text-sky-50 border-green-700 ${
            tabIdentifiers[i] === currentTab ? "border-y-2" : ""
          }`}
          onClick={() => setCurrentTab(tabIdentifiers[i])}
        >
          {name}
        </div>
      ))}
    </nav>
  );
}

function CurrentTab() {
  const [currentTab] = useCurrentTab();

  if (currentTab === "workout") {
    return <WorkoutTab />;
  }

  if (currentTab === "settings") {
    return <SettingsTab />;
  }
}

function WorkoutTab() {
  return (
    <>
      <WorkoutControlButtons />
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

function SettingsTab() {
  const [settings, _] = useSettings();
  const newGroupNameRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <GlobalTimeSettingsBox />
      {settings.exerciseGroups.map((group, i) => (
        <ExerciseGroupSection
          key={group.identifier}
          group={group}
          groupNameRef={
            i === settings.exerciseGroups.length - 1
              ? newGroupNameRef
              : undefined
          }
        />
      ))}
      <AddExerciseGroupButton newGroupNameRef={newGroupNameRef} />
      {settings.exerciseGroups.length === 0 && <RestoreDefaultsButton />}
    </>
  );
}

function GlobalTimeSettingsBox() {
  return (
    <div className="text-sky-50 bg-sky-900 p-2 shadow-sm shadow-gray-800">
      <WarmupDurationInput />
      <FirstExercisePreparationDurationInput />
      <DefaultTaskDurationInput />
      <CooldownDurationInput />
      <NextExerciseAnnouncementOffsetInput />
      <GroupsPerWorkoutInput />
      <SetsPerGroupRangeInput />
      <SetRepetitionsRangeInput />
    </div>
  );
}

function WarmupDurationInput() {
  return (
    <SettingsNumberInput
      label="Warmup"
      getter={(settings) => settings.warmupDuration}
      setter={(settings, newProp) => (settings.warmupDuration = newProp)}
    />
  );
}

function DefaultTaskDurationInput() {
  return (
    <SettingsNumberInput
      label="Set"
      getter={(settings) => settings.defaultTaskDuration}
      setter={(settings, newProp) => (settings.defaultTaskDuration = newProp)}
    />
  );
}

function CooldownDurationInput() {
  return (
    <SettingsNumberInput
      label="Cooldown"
      getter={(settings) => settings.cooldownDuration}
      setter={(settings, newProp) => (settings.cooldownDuration = newProp)}
    />
  );
}

function GroupsPerWorkoutInput() {
  return (
    <SettingsNumberInput
      label="Groups per Workout"
      getter={(settings) => settings.groupsPerWorkout}
      setter={(settings, newProp) => (settings.groupsPerWorkout = newProp)}
    />
  );
}

function FirstExercisePreparationDurationInput() {
  return (
    <SettingsNumberInput
      label="Initial Preparation"
      getter={(settings) => settings.firstExercisePreparationDuration}
      setter={(settings, newProp) =>
        (settings.firstExercisePreparationDuration = newProp)
      }
    />
  );
}

function NextExerciseAnnouncementOffsetInput() {
  return (
    <SettingsNumberInput
      label="Announcement Offset"
      getter={(settings) => settings.nextExerciseAnnouncementOffset}
      setter={(settings, newProp) =>
        (settings.nextExerciseAnnouncementOffset = newProp)
      }
    />
  );
}

function SetsPerGroupRangeInput() {
  return (
    <SettingsRangeInput
      label="Sets per Group"
      getter={(settings) => [
        settings.minSetsPerGroup,
        settings.maxSetsPerGroup,
      ]}
      setter={(settings, newProp) => {
        settings.minSetsPerGroup = newProp[0];
        settings.maxSetsPerGroup = newProp[1];
      }}
    />
  );
}

function SetRepetitionsRangeInput() {
  return (
    <SettingsRangeInput
      label="Set Repetitions"
      getter={(settings) => [
        settings.minSetRepetitions,
        settings.maxSetRepetitions,
      ]}
      setter={(settings, newProp) => {
        settings.minSetRepetitions = newProp[0];
        settings.maxSetRepetitions = newProp[1];
      }}
    />
  );
}

function SettingsNumberInput({
  label,
  getter,
  setter,
}: {
  label: string;
  getter: (settings: Settings) => number;
  setter: (settings: Settings, newProp: number) => void;
}) {
  const [settings, setSettings] = useSettings();

  function updateProp(newProp: number) {
    if (isNaN(newProp)) {
      newProp = 0;
    }
    setter(settings, newProp);
    setSettings(settings);
  }

  return (
    <div className="flex m-2 items-center">
      <label className="w-44">{label}:</label>
      <input
        type="number"
        value={getter(settings)}
        onChange={(e) => updateProp(parseInt(e.target.value))}
        className="flex-1 bg-transparent border-lime-700 border-2 rounded px-2 py-1 focus:outline-none min-w-8 appearance-none"
      />
    </div>
  );
}

function SettingsRangeInput({
  label,
  getter,
  setter,
}: {
  label: string;
  getter: (settings: Settings) => [number, number];
  setter: (settings: Settings, newProp: [number, number]) => void;
}) {
  const [settings, setSettings] = useSettings();
  const [oldMin, oldMax] = getter(settings);

  function updateMin(newMin: number) {
    if (isNaN(newMin)) {
      newMin = 0;
    }
    setter(settings, [newMin, oldMax]);
    setSettings(settings);
  }

  function updateMax(newMax: number) {
    if (isNaN(newMax)) {
      newMax = 0;
    }
    setter(settings, [oldMin, newMax]);
    setSettings(settings);
  }

  return (
    <div className="flex m-2 items-center">
      <label className="w-44">{label}:</label>
      <input
        type="number"
        value={oldMin}
        onChange={(e) => updateMin(parseInt(e.target.value))}
        min={1}
        className="flex-1 bg-transparent border-lime-700 border-2 rounded px-2 py-1 focus:outline-none mr-2 min-w-8"
      />
      <input
        type="number"
        value={oldMax}
        onChange={(e) => updateMax(parseInt(e.target.value))}
        min={1}
        className="flex-1 bg-transparent border-lime-700 border-2 rounded px-2 py-1 focus:outline-none min-w-8"
      />
    </div>
  );
}

function ExerciseGroupSection({
  group,
  groupNameRef,
}: {
  group: ExerciseGroup;
  groupNameRef: React.RefObject<HTMLInputElement | null> | undefined;
}) {
  const [settings, setSettings] = useSettings();
  const newExerciseNameRef = useRef<HTMLInputElement>(null);

  function renameGroup(newName: string) {
    const foundGroup = settings.exerciseGroups.find(
      (g) => g.identifier === group.identifier
    )!;
    foundGroup.name = newName;
    setSettings(settings);
  }

  function removeGroup() {
    settings.exerciseGroups = settings.exerciseGroups.filter(
      (g) => g.identifier !== group.identifier
    );
    setSettings(settings);
  }

  function toggleActive() {
    const foundGroup = settings.exerciseGroups.find(
      (g) => g.identifier === group.identifier
    )!;
    foundGroup.active = !foundGroup.active;
    setSettings(settings);
  }

  return (
    <div className="bg-sky-900 my-2 p-2">
      <div className="flex justify-between items-center">
        <div className="font-bold">
          <input
            type="checkbox"
            checked={group.active ?? true}
            onChange={toggleActive}
            className="ml-2 mr-4 cursor-pointer"
          />
          <input
            value={group.name}
            onChange={(e) => renameGroup(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && (e.target as HTMLInputElement).blur()
            }
            className="bg-transparent p-2 text-sky-50"
            ref={groupNameRef}
            placeholder="Exercise Group Name"
          />
        </div>
        <div
          className="text-sky-300 mr-3 cursor-pointer select-none"
          onClick={removeGroup}
        >
          Remove Group
        </div>
      </div>
      {group.exercises.map((exercise, i) => (
        <ExerciseInfoRow
          key={exercise.identifier}
          group={group}
          exercise={exercise}
          nameRef={
            i === group.exercises.length - 1 ? newExerciseNameRef : undefined
          }
        />
      ))}
      <AddExerciseButton
        group={group}
        newExerciseNameRef={newExerciseNameRef}
      />
    </div>
  );
}

function AddExerciseGroupButton({
  newGroupNameRef,
}: {
  newGroupNameRef: React.RefObject<HTMLInputElement | null> | undefined;
}) {
  const [settings, setSettings] = useSettings();

  function addGroup() {
    const newIdentifier = getNewIdentifier();
    settings.exerciseGroups.push({
      identifier: newIdentifier,
      name: "",
      exercises: [],
      active: true,
    });
    setSettings(settings);
    setTimeout(() => {
      newGroupNameRef?.current?.focus();
    }, 0);
  }

  return (
    <div className="flex space-x-2">
      <button
        onClick={addGroup}
        className="m-2 cursor-pointer bg-gray-800 py-1 px-2 rounded hover:bg-gray-900 transition duration-300 text-sky-50 select-none"
      >
        Add Exercise Group
      </button>
    </div>
  );
}

function RestoreDefaultsButton() {
  const [_, setSettings] = useSettings();

  function restoreDefaults() {
    setSettings(defaultSettings);
  }

  return (
    <div className="flex space-x-2">
      <button
        onClick={restoreDefaults}
        className="m-2 cursor-pointer bg-gray-800 py-1 px-2 rounded hover:bg-gray-900 transition duration-300 text-sky-50 select-none"
      >
        Restore Defaults
      </button>
    </div>
  );
}

function ExerciseInfoRow({
  group,
  exercise,
  nameRef,
}: {
  group: ExerciseGroup;
  exercise: Exercise;
  nameRef: React.RefObject<HTMLInputElement | null> | undefined;
}) {
  const [settings, setSettings] = useSettings();

  function renameExercise(newName: string) {
    const foundExercise = findExercise(
      settings.exerciseGroups,
      exercise.identifier
    )!;
    foundExercise.name = newName;
    setSettings(settings);
  }

  function removeExercise() {
    const foundGroup = settings.exerciseGroups.find(
      (g) => g.identifier === group.identifier
    )!;
    foundGroup.exercises = foundGroup.exercises.filter(
      (e) => e.identifier !== exercise.identifier
    );
    setSettings(settings);
  }

  return (
    <div className="flex justify-between items-center">
      <input
        value={exercise.name}
        onChange={(e) => renameExercise(e.target.value)}
        onKeyDown={(e) =>
          e.key === "Enter" && (e.target as HTMLInputElement).blur()
        }
        className="bg-transparent pl-2 py-1 text-sky-50 w-64"
        ref={nameRef}
        placeholder="Exercise Name"
      />
      <div
        className="p-1 hover:underline cursor-pointer text-sky-300 mr-2 select-none"
        onClick={removeExercise}
      >
        Remove
      </div>
    </div>
  );
}

function AddExerciseButton({
  group,
  newExerciseNameRef,
}: {
  group: ExerciseGroup;
  newExerciseNameRef: React.RefObject<HTMLInputElement | null> | undefined;
}) {
  const [settings, setSettings] = useSettings();

  function addExercise() {
    const foundGroup = settings.exerciseGroups.find(
      (g) => g.identifier === group.identifier
    )!;
    foundGroup.exercises.push({
      identifier: getNewIdentifier(),
      name: "",
    });
    setSettings(settings);
    setTimeout(() => {
      newExerciseNameRef?.current?.focus();
    }, 0);
  }

  return (
    <div className="px-4 mt-2">
      <button
        onClick={addExercise}
        className="cursor-pointer bg-gray-800 py-1 px-2 rounded hover:bg-gray-900 transition duration-300 text-sky-50 select-none"
      >
        Add Exercise
      </button>
    </div>
  );
}

function getNewIdentifier() {
  return Math.random().toString().substring(2);
}

const settingsLocalStorageKey = "settings";
const workoutLocalStorageKey = "currentWorkout";

function useSettings(): LocalStorageState<Settings> {
  let result = useLocalStorageState<Settings>(settingsLocalStorageKey, {
    defaultValue: defaultSettings,
  });
  return result;
}

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

function useCurrentTab() {
  return useLocalStorageState<string>("currentTab", {
    defaultValue: "workout",
  });
}

function useCurrentWorkout(): LocalStorageState<Workout> {
  return useLocalStorageState<Workout>(workoutLocalStorageKey, {
    defaultValue: defaultWorkout,
  });
}

function generateWorkout(settings: Settings) {
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
        tasks.push({
          name: exercise.name,
          duration: settings.defaultTaskDuration,
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

function shuffleArray<T>(array: T[]) {
  let currentIndex = array.length;
  let randomIndex: number;

  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}

function repeatToLength<T>(array: T[], length: number) {
  const result: T[] = [];
  for (let i = 0; i < length; i++) {
    result.push(array[i % array.length]);
  }
  return result;
}

function randomChoiceUniqueN<T>(array: T[], n: number) {
  const arrayCopy = [...array];
  shuffleArray(arrayCopy);
  return arrayCopy.slice(0, n);
}

function randomIntegerInRangeInclusive(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function workoutHasBegan(workout: Workout) {
  for (const task of workout.tasks) {
    if (task.currentSecond > 0) {
      return true;
    }
  }
  return false;
}

function workoutHasEnded(workout: Workout) {
  for (const task of workout.tasks) {
    if (task.currentSecond < task.duration) {
      return false;
    }
  }
  return true;
}

function getRemainingWorkoutTime(workout: Workout) {
  let time = 0;
  for (const task of workout.tasks) {
    time += task.duration - task.currentSecond;
  }
  return time;
}

function getTotalWorkoutTime(workout: Workout) {
  let time = 0;
  for (const task of workout.tasks) {
    time += task.duration;
  }
  return time;
}

function secondsToTimeString(seconds: number) {
  seconds = Math.floor(seconds);
  const minutes = Math.floor(seconds / 60);
  const secondsNum = seconds % 60;
  return `${minutes}:${secondsNum < 10 ? "0" : ""}${secondsNum}`;
}

function addSecondInWorkout(workout: Workout, settings: Settings) {
  for (let task_i = 0; task_i < workout.tasks.length; task_i++) {
    const task = workout.tasks[task_i];
    if (task.currentSecond < task.duration) {
      task.currentSecond += 1;

      saySomethingIfNecessary(workout, task_i, settings);
      if (task.currentSecond === task.duration) {
        if (task_i < workout.tasks.length - 1) {
          saySomethingIfNecessary(workout, task_i + 1, settings);
        }
      }
      return;
    }
  }
  return;
}

function saySomethingIfNecessary(
  workout: Workout,
  currentTaskIndex: number,
  settings: Settings
) {
  const task = workout.tasks[currentTaskIndex];
  const nextTask =
    currentTaskIndex < workout.tasks.length - 1
      ? workout.tasks[currentTaskIndex + 1]
      : null;

  const taskJustStarted = task.currentSecond === 0;
  const taskJustEnded = task.currentSecond === task.duration;
  const fiveSecondsToGo = task.currentSecond === task.duration - 5;
  const halfwayThrough = task.currentSecond === Math.floor(task.duration / 2);

  const fiveSecondsToGoMessage = "5 seconds to go!";
  const halfwayThroughMessage = "Halfway through!";

  switch (task.type) {
    case "warmup": {
      if (taskJustStarted) {
        say(`Starting with warmup!`);
      } else if (halfwayThrough) {
        say(halfwayThroughMessage);
      } else if (fiveSecondsToGo) {
        say(fiveSecondsToGoMessage);
      }
      break;
    }
    case "initial-preparation": {
      if (taskJustStarted && nextTask) {
        say(`Prepare ${nextTask.name}!`);
      } else if (fiveSecondsToGo) {
        say(fiveSecondsToGoMessage);
      }
      break;
    }
    case "exercise": {
      if (taskJustStarted) {
        say(`GO!`);
      } else if (
        task.currentSecond ===
        task.duration - settings.nextExerciseAnnouncementOffset
      ) {
        if (nextTask) {
          if (nextTask.name == task.name) {
            say("Next up: [pause] Same exercise!");
          } else {
            say(`Next up: [pause] ${nextTask.name}!`);
          }
        }
      } else if (
        settings.nextExerciseAnnouncementOffset >= 25 &&
        task.currentSecond == task.duration - 15
      ) {
        say("15 seconds to go!");
      } else if (fiveSecondsToGo) {
        say(fiveSecondsToGoMessage);
      }
      break;
    }
    case "cooldown": {
      if (taskJustStarted) {
        say(`Go!`);
      } else if (halfwayThrough) {
        say(halfwayThroughMessage);
      } else if (fiveSecondsToGo) {
        say(fiveSecondsToGoMessage);
      } else if (taskJustEnded) {
        say(`DONE!`);
      }
      break;
    }
  }
}

function say(text: string) {
  // Adding "[pause]" because otherwise sometimes the speech generation misses some words.
  const updatedText = "[pause] " + text;
  const encodedText = encodeURIComponent(updatedText);
  const sound = new Audio(
    `https://speech.jlucke.com/speak?text=${encodedText}&voice=echo&volume=3.0`
  );
  sound.play();
}

function findExercise(groups: ExerciseGroup[], identifier: string) {
  for (const group of groups) {
    for (const exercise of group.exercises) {
      if (exercise.identifier === identifier) {
        return exercise;
      }
    }
  }
  return null;
}

async function ensureWakeLock() {
  if (wakeLock !== null) {
    return;
  }
  try {
    // My fail if e.g. another tab is open.
    wakeLock = await navigator.wakeLock.request("screen");
  } catch {
    return;
  }
  wakeLock.addEventListener("release", () => {
    console.log("wake lock released");
    wakeLock = null;
  });
}

function ensureNoWakeLock() {
  if (wakeLock === null) {
    return;
  }
  wakeLock.release();
  wakeLock = null;
}

versioningSettings();
versioningWorkout();

export default App;
