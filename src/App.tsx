import { useState, useEffect, useContext, createContext } from "react";
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
          className={`flex justify-center items-center shadow-md px-4 py-2 mx-4 rounded bg-gray-800 hover:bg-gray-900 transition duration-300 cursor-pointer text-sky-50 border-green-700 ${
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
  function toggleIsPlaying() {
    setIsPlaying(!isPlaying);
  }

  return (
    <div
      onClick={toggleIsPlaying}
      className="cursor-pointer bg-gray-800 py-2 w-full mx-2 rounded hover:bg-gray-900 transition duration-300 text-center"
    >
      {isPlaying ? "Pause" : has_began ? "Continue" : "Start"}
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
      className="cursor-pointer bg-gray-800 py-2 px-4 rounded hover:bg-gray-900 transition duration-300"
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
      className="cursor-pointer bg-gray-800 py-2 px-4 rounded hover:bg-gray-900 transition duration-300"
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
  return (
    <>
      <WarmupDurationInput />
      <DefaultTaskDurationInput />
      <CooldownDurationInput />
      <GroupSeparator />
      {settings.exerciseGroups.map((group) => (
        <>
          <ExerciseGroupSection key={group.identifier} group={group} />
          <GroupSeparator />
        </>
      ))}
      <ExerciseGroupAdder />
    </>
  );
}

function GroupSeparator() {
  return <div className="border-b border-gray-300" />;
}

function WarmupDurationInput() {
  const [settings, setSettings] = useSettings();

  function updateWarmupDuration(newDuration: number) {
    settings.warmupDuration = newDuration;
    setSettings(settings);
  }

  return (
    <div>
      Warmup Duration:
      <input
        type="number"
        value={settings.warmupDuration}
        onChange={(e) => updateWarmupDuration(parseInt(e.target.value))}
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
    <div>
      Default Task Duration:
      <input
        type="number"
        value={settings.defaultTaskDuration}
        onChange={(e) => updateDefaultTaskDuration(parseInt(e.target.value))}
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
    <div>
      Cooldown Duration:
      <input
        type="number"
        value={settings.cooldownDuration}
        onChange={(e) => updateCooldownDuration(parseInt(e.target.value))}
      />
    </div>
  );
}

function ExerciseGroupSection({ group }: { group: ExerciseGroup }) {
  const [settings, setSettings] = useSettings();

  function renameGroup(newName: string) {
    const foundGroup = settings.exerciseGroups.find(
      (group) => group.identifier === group.identifier
    )!;
    foundGroup.name = newName;
    setSettings(settings);
  }

  return (
    <>
      <div className="font-bold">
        <input
          value={group.name}
          onChange={(e) => renameGroup(e.target.value)}
        />
      </div>
      {group.exercises.map((exercise) => (
        <ExerciseInfoRow key={exercise.identifier} exercise={exercise} />
      ))}
      <ExerciseAdder settings={settings} group={group} />
    </>
  );
}

function ExerciseGroupAdder() {
  const [settings, setSettings] = useSettings();
  const [newGroupName, setNewGroupName] = useState("");

  function addGroup() {
    const newIdentifier = getNewIdentifier();
    settings.exerciseGroups.push({
      identifier: newIdentifier,
      name: newGroupName,
      exercises: [],
    });
    setSettings(settings);
    setNewGroupName("");
  }

  return (
    <div className="flex space-x-2">
      <input
        value={newGroupName}
        onChange={(e) => setNewGroupName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && addGroup()}
        className="flex-grow border border-gray-300 rounded px-3 py-2"
        placeholder="Group Name"
      />
      <button
        onClick={addGroup}
        className="w-12 bg-blue-500 text-white font-bold rounded hover:bg-blue-600"
        disabled={!newGroupName}
      >
        +
      </button>
    </div>
  );
}

function ExerciseInfoRow({ exercise }: { exercise: Exercise }) {
  const [settings, setSettings] = useSettings();

  function renameExercise(newName: string) {
    const foundExercise = findExercise(
      settings.exerciseGroups,
      exercise.identifier
    )!;
    foundExercise.name = newName;
    setSettings(settings);
  }
  return (
    <div>
      <input
        value={exercise.name}
        onChange={(e) => renameExercise(e.target.value)}
      />
    </div>
  );
}

function ExerciseAdder({
  settings,
  group,
}: {
  settings: Settings;
  group: ExerciseGroup;
}) {
  const [newExerciseName, setNewExerciseName] = useState("");
  const [_, setSettings] = useSettings();

  function addExercise() {
    group.exercises.push({
      identifier: getNewIdentifier(),
      name: newExerciseName,
    });
    setSettings(settings);
    setNewExerciseName("");
  }

  return (
    <div className="flex space-x-2">
      <input
        value={newExerciseName}
        onChange={(e) => setNewExerciseName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && addExercise()}
        className="flex-grow border border-gray-300 rounded px-3 py-2"
        placeholder="Exercise Name"
      />
      <button
        onClick={addExercise}
        className="w-12 bg-blue-500 text-white font-bold rounded hover:bg-blue-600"
        disabled={!newExerciseName}
      >
        +
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

  for (const group of settings.exerciseGroups) {
    for (const exercise of group.exercises) {
      workout.tasks.push({
        name: exercise.name,
        duration: settings.defaultTaskDuration,
        currentSecond: 0,
      });
    }
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

function addSecondInWorkout(workout: Workout) {
  for (let task_i = 0; task_i < workout.tasks.length; task_i++) {
    const task = workout.tasks[task_i];
    if (task.currentSecond < task.duration) {
      if (task_i === 0 && task.currentSecond === 0) {
        say(`[pause] Starting with ${task.name}!`);
      }
      task.currentSecond += 1;

      if (task_i < workout.tasks.length - 1) {
        const nextTask = workout.tasks[task_i + 1];
        if (task.currentSecond === task.duration - 10) {
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
