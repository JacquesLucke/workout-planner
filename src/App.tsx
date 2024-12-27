import { useState, useEffect, useContext, createContext, useRef } from "react";
import useLocalStorageState from "use-local-storage-state";

interface Settings {
  exerciseGroups: ExerciseGroup[];
  warmupDuration: number;
  cooldownDuration: number;
  defaultTaskDuration: number;
}

interface ExerciseGroup {
  identifier: string;
  name: string;
  exercises: Exercise[];
}

interface Exercise {
  identifier: string;
  name: string;
}

interface Workout {
  tasks: WorkoutTask[];
}

interface WorkoutTask {
  name: string;
  duration: number;
  currentSecond: number;
}

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

  async function setIsPlayingWrap(newState: boolean) {
    setIsPlaying(newState);
    try {
      if (newState) {
        if (wakeLock === null) {
          wakeLock = await navigator.wakeLock.request("screen");
        }
      } else {
        if (wakeLock !== null) {
          wakeLock.release();
          wakeLock = null;
        }
      }
    } catch {}
  }

  return (
    <>
      <IsPlayingContext.Provider
        value={{ isPlaying, setIsPlaying: setIsPlayingWrap }}
      >
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
  const { isPlaying, setIsPlaying } = useContext(IsPlayingContext);
  const has_began = workoutHasBegan(workout);
  const has_ended = workoutHasEnded(workout);

  function toggleIsPlaying() {
    if (has_ended) {
      return;
    }
    setIsPlaying(!isPlaying);
  }

  return (
    <div
      onClick={toggleIsPlaying}
      className={`py-2 w-full mx-2 rounded transition duration-300 text-center select-none ${
        has_ended
          ? "bg-gray-600"
          : "bg-gray-800 hover:bg-gray-900 cursor-pointer"
      }`}
    >
      {isPlaying
        ? "Pause"
        : has_began
        ? has_ended
          ? "Done"
          : "Continue"
        : "Start"}
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
  const [currentWorkout, setCurrentWorkout] = useCurrentWorkout();
  const { isPlaying, setIsPlaying } = useContext(IsPlayingContext);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }
    let interval = setInterval(() => {
      const isDone = addSecondInWorkout(currentWorkout);
      setCurrentWorkout(currentWorkout);
      if (isDone) {
        setIsPlaying(false);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

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
    <div className="w-full h-8 relative border-t-2 border-sky-800">
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
    </>
  );
}

function GlobalTimeSettingsBox() {
  return (
    <div className="text-sky-50 bg-sky-900 p-2 shadow-sm shadow-gray-800">
      <WarmupDurationInput />
      <DefaultTaskDurationInput />
      <CooldownDurationInput />
    </div>
  );
}

function WarmupDurationInput() {
  const [settings, setSettings] = useSettings();

  function updateWarmupDuration(newDuration: number) {
    settings.warmupDuration = newDuration;
    setSettings(settings);
  }

  return (
    <div className="flex m-2 items-center">
      <label className="w-1/3">Warmup:</label>
      <input
        type="number"
        value={settings.warmupDuration}
        onChange={(e) => updateWarmupDuration(parseInt(e.target.value))}
        className="flex-1 bg-transparent border-lime-700 border-2 rounded px-2 py-1 focus:outline-none"
      />
    </div>
  );
}

function DefaultTaskDurationInput() {
  const [settings, setSettings] = useSettings();

  function updateDefaultTaskDuration(newDuration: number) {
    settings.defaultTaskDuration = newDuration;
    setSettings(settings);
  }

  return (
    <div className="flex m-2 items-center">
      <label className="w-1/3">Set:</label>
      <input
        type="number"
        value={settings.defaultTaskDuration}
        onChange={(e) => updateDefaultTaskDuration(parseInt(e.target.value))}
        className="flex-1 bg-transparent border-lime-700 border-2 rounded px-2 py-1 focus:outline-none"
      />
    </div>
  );
}

function CooldownDurationInput() {
  const [settings, setSettings] = useSettings();

  function updateCooldownDuration(newDuration: number) {
    settings.cooldownDuration = newDuration;
    setSettings(settings);
  }

  return (
    <div className="flex m-2 items-center">
      <label className="w-1/3">Cooldown:</label>
      <input
        type="number"
        value={settings.cooldownDuration}
        onChange={(e) => updateCooldownDuration(parseInt(e.target.value))}
        className="flex-1 bg-transparent border-lime-700 border-2 rounded px-2 py-1 focus:outline-none"
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

  return (
    <div className="bg-sky-900 my-2 p-2">
      <div className="flex justify-between items-center">
        <div className="font-bold">
          <input
            value={group.name}
            onChange={(e) => renameGroup(e.target.value)}
            className="bg-transparent p-2 text-sky-50"
            ref={groupNameRef}
            placeholder="Exercise Group Name"
          />
        </div>
        <div className="text-sky-300 mr-3 cursor-pointer" onClick={removeGroup}>
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
        className="bg-transparent pl-2 py-1 text-sky-50"
        ref={nameRef}
        placeholder="Exercise Name"
      />
      <div
        className="p-1 hover:underline cursor-pointer text-sky-300 mr-2"
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

function useSettings() {
  return useLocalStorageState<Settings>("settings", {
    defaultValue: {
      exerciseGroups: [],
      warmupDuration: 60,
      cooldownDuration: 60,
      defaultTaskDuration: 60,
    },
  });
}

function useCurrentTab() {
  return useLocalStorageState<string>("currentTab", {
    defaultValue: "settings",
  });
}

function useCurrentWorkout() {
  return useLocalStorageState<Workout>("currentWorkout", {
    defaultValue: { tasks: [] },
  });
}

function generateWorkout(settings: Settings) {
  const workout: Workout = {
    tasks: [],
  };

  if (settings.warmupDuration > 0) {
    workout.tasks.push({
      name: "Warmup",
      duration: settings.warmupDuration,
      currentSecond: 0,
    });
  }

  const groups = randomChoiceUniqueN(settings.exerciseGroups, 2);
  for (const group of groups) {
    const exercises = randomChoiceUniqueN(group.exercises, 2);
    for (const exercise of exercises) {
      const setsNum = Math.floor(Math.random() * 2) + 2;
      for (let i = 0; i < setsNum; i++) {
        workout.tasks.push({
          name: exercise.name,
          duration: settings.defaultTaskDuration,
          currentSecond: 0,
        });
      }
    }
  }

  if (settings.cooldownDuration > 0) {
    workout.tasks.push({
      name: "Cooldown",
      duration: settings.cooldownDuration,
      currentSecond: 0,
    });
  }

  return workout;
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

function randomChoiceUniqueN<T>(array: T[], n: number) {
  const arrayCopy = [...array];
  shuffleArray(arrayCopy);
  return arrayCopy.slice(0, n);
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

function addSecondInWorkout(workout: Workout) {
  for (let task_i = 0; task_i < workout.tasks.length; task_i++) {
    const task = workout.tasks[task_i];
    if (task.currentSecond < task.duration) {
      if (task_i === 0 && task.currentSecond === 0) {
        say(`[pause] Starting with ${task.name}!`);
      }
      task.currentSecond += 1;

      const nextUpTime = Math.max(5, Math.ceil(task.duration * 0.25));
      if (task_i < workout.tasks.length - 1) {
        const nextTask = workout.tasks[task_i + 1];
        if (task.currentSecond === task.duration - nextUpTime) {
          if (task.name == nextTask.name) {
            say("[pause] Next up: [pause] Same exercise!");
          } else {
            say(`[pause] Next up: [pause] ${nextTask.name}!`);
          }
        }
        if (task.currentSecond === task.duration) {
          say("GO!");
        }
      } else {
        if (task.currentSecond === task.duration) {
          say("DONE!");
          break;
        }
      }
      if (nextUpTime >= 10) {
        if (task.currentSecond === task.duration - 5) {
          say("[pause] 5 seconds to go!");
        }
      }
      return false;
    }
  }
  return true;
}

function say(text: string) {
  const encodedText = encodeURIComponent(text);
  const sound = new Audio(
    `https://speech.jlucke.com/speak?text=${encodedText}&voice=echo`
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

export default App;
