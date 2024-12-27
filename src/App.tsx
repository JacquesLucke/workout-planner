import { useState, useEffect, useContext, createContext } from "react";
import useLocalStorageState from "use-local-storage-state";

interface Settings {
  exerciseGroups: ExerciseGroup[];
  warmupDuration: number;
  cooldownDuration: number;
  defaultTaskDuration: number;
}

interface ExerciseGroups {
  groups: ExerciseGroup[];
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

  return (
    <nav className="flex space-x-2">
      <div
        className={`w-full bg-blue-500 text-white font-bold p-1 text-center cursor-pointer ${
          currentTab === "workout" ? "bg-blue-300" : "hover:bg-blue-600"
        }`}
        onClick={() => setCurrentTab("workout")}
      >
        Workout
      </div>
      <div
        className={`w-full bg-blue-500 text-white font-bold p-1 text-center cursor-pointer ${
          currentTab === "settings" ? "bg-blue-300" : "hover:bg-blue-600"
        }`}
        onClick={() => setCurrentTab("settings")}
      >
        Settings
      </div>
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
      <NewWorkout />
      <PlayPause />
      <ResetWorkoutButton />
      <WorkoutList />
    </>
  );
}

function PlayPause() {
  const { isPlaying, setIsPlaying } = useContext(IsPlayingContext);
  function toggleIsPlaying() {
    setIsPlaying(!isPlaying);
  }

  return (
    <button
      onClick={toggleIsPlaying}
      className="w-full bg-blue-500 text-white font-bold p-1 text-center rounded hover:bg-blue-600"
    >
      {isPlaying ? "Pause" : "Play"}
    </button>
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
    <button
      onClick={resetWorkout}
      className="w-full bg-blue-500 text-white font-bold p-1 text-center rounded hover:bg-blue-600"
    >
      Reset
    </button>
  );
}

function NewWorkout() {
  const [settings] = useSettings();
  const [_, setCurrentWorkout] = useCurrentWorkout();
  const { setIsPlaying } = useContext(IsPlayingContext);

  function updateWorkout() {
    setCurrentWorkout(generateWorkout(settings));
    setIsPlaying(false);
  }

  return (
    <button
      onClick={updateWorkout}
      className="w-full bg-blue-500 text-white font-bold p-1 text-center rounded hover:bg-blue-600"
    >
      New Workout
    </button>
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
    <div>
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
    <div className="w-full h-8 relative">
      <div
        className="absolute h-full bg-green-500 transition-all duration-300"
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
  return (
    <>
      <ExerciseGroupAdder />
      <ExerciseGroupSelector />
      <ExerciseList />
      <AddExercise />
    </>
  );
}

function ExerciseGroupAdder() {
  const [settings, setSettings] = useSettings();
  const [_, setCurrentGroup] = useCurrentGroupID();
  const [newGroupName, setNewGroupName] = useState("");

  function addGroup() {
    const newIdentifier = getNewIdentifier();
    settings.exerciseGroups.push({
      identifier: newIdentifier,
      name: newGroupName,
      exercises: [],
    });
    setSettings(settings);
    setCurrentGroup(newIdentifier);
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

function ExerciseGroupSelector() {
  const [settings] = useSettings();
  const [currentGroupID, setCurrentGroup] = useCurrentGroupID();

  const currentGroup = settings.exerciseGroups.find(
    (group) => group.identifier === currentGroupID
  );

  if (!currentGroup) {
    return <p>There is no group with this ID.</p>;
  }

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setCurrentGroup(e.target.value);
  }

  return (
    <select
      value={currentGroup.identifier}
      onChange={onChange}
      className="border border-gray-300 rounded px-3 py-2"
    >
      {settings.exerciseGroups.map((group) => (
        <option key={group.identifier} value={group.identifier}>
          {group.name}
        </option>
      ))}
    </select>
  );
}

function ExerciseList() {
  const [settings] = useSettings();
  const [currentGroupID] = useCurrentGroupID();

  if (!currentGroupID) {
    return null;
  }

  const currentGroup = settings.exerciseGroups.find(
    (group) => group.identifier === currentGroupID
  );
  if (!currentGroup) {
    return null;
  }

  return (
    <div>
      {currentGroup.exercises.map((exercise) => (
        <ExerciseInfoRow key={exercise.identifier} exercise={exercise} />
      ))}
    </div>
  );
}

function ExerciseInfoRow({ exercise }: { exercise: Exercise }) {
  return <div>{exercise.name}</div>;
}

function AddExercise() {
  const [settings, setSettings] = useSettings();
  const [currentGroupID, _] = useCurrentGroupID();
  const [newExerciseName, setNewExerciseName] = useState("");

  if (!currentGroupID) {
    return null;
  }
  const currentGroup = settings.exerciseGroups.find(
    (group) => group.identifier === currentGroupID
  );
  if (!currentGroup) {
    return null;
  }

  function addExercise() {
    currentGroup!.exercises.push({
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

function useCurrentGroupID() {
  return useLocalStorageState<string | null>("currentGroupID", {
    defaultValue: null,
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

function findExercise(exerciseGroups: ExerciseGroups, identifier: string) {
  for (const group of exerciseGroups.groups) {
    for (const exercise of group.exercises) {
      if (exercise.identifier === identifier) {
        return exercise;
      }
    }
  }
  return null;
}

export default App;
