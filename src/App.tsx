import { useState, useEffect, useContext, createContext } from "react";
import useLocalStorageState from "use-local-storage-state";

interface ExerciseGroups {
  groups: ExerciseGroup[];
}

enum ExerciseGroupType {
  Warmup = "warmup",
  Main = "main",
  Cooldown = "cooldown",
}

interface ExerciseGroup {
  identifier: string;
  name: string;
  type: ExerciseGroupType | undefined;
  exercises: Exercise[];
}

interface Exercise {
  identifier: string;
  name: string;
  durationSeconds: number | undefined;
}

interface Workout {
  sets: SingleSet[];
}

interface SingleSet {
  exercise: Exercise;
  currentSecond: number;
}

const fallbackDuration = 60;

interface IsPlayingState {
  isPlaying: boolean;
  setIsPlaying: (isPlaying: boolean) => void;
}

const IsPlayingContext = createContext<IsPlayingState>({
  isPlaying: false,
  setIsPlaying: () => {},
});

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
    return <Workout />;
  }

  if (currentTab === "settings") {
    return <Settings />;
  }
}

function Workout() {
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
    for (const set of currentWorkout.sets) {
      set.currentSecond = 0;
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
  const [exerciseGroups] = useExerciseGroups();
  const [_, setCurrentWorkout] = useCurrentWorkout();
  const { setIsPlaying } = useContext(IsPlayingContext);

  function updateWorkout() {
    setCurrentWorkout(generateWorkout(exerciseGroups));
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
      {currentWorkout.sets.map((set, i) => (
        <WorkoutSet key={i} set={set} />
      ))}
    </div>
  );
}

function WorkoutSet({ set }: { set: SingleSet }) {
  const duration = set.exercise.durationSeconds ?? fallbackDuration;
  const remainingSeconds = duration - set.currentSecond;
  const progressText = remainingSeconds === 0 ? "Done" : `${remainingSeconds}s`;
  return (
    <div className="w-full h-8 relative">
      <div
        className="absolute h-full bg-green-500 transition-all duration-300"
        style={{ width: `${(set.currentSecond / duration) * 100}%` }}
      >
        <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-white font-bold whitespace-nowrap">
          {set.exercise.name}
        </span>
      </div>
      <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white">
        {progressText}
      </span>
    </div>
  );
}

function Settings() {
  return (
    <>
      <AddExerciseGroup />
      <SelectExerciseGroup />
      <ExerciseGroupTypeSelect />
      <ExerciseList />
      <AddExercise />
    </>
  );
}

function AddExerciseGroup() {
  const [exerciseGroups, setExerciseGroups] = useExerciseGroups();
  const [_, setCurrentGroup] = useCurrentGroupID();
  const [newGroupName, setNewGroupName] = useState("");

  function addGroup() {
    const newIdentifier = getNewIdentifier();
    exerciseGroups.groups.push({
      identifier: newIdentifier,
      name: newGroupName,
      exercises: [],
      type: ExerciseGroupType.Main,
    });
    setExerciseGroups(exerciseGroups);
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

function SelectExerciseGroup() {
  const [exerciseGroups, _] = useExerciseGroups();
  const [currentGroupID, setCurrentGroup] = useCurrentGroupID();

  const currentGroup = exerciseGroups.groups.find(
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
      {exerciseGroups.groups.map((group) => (
        <option key={group.identifier} value={group.identifier}>
          {group.name}
        </option>
      ))}
    </select>
  );
}

function ExerciseGroupTypeSelect() {
  const [exerciseGroups, setExerciseGroups] = useExerciseGroups();
  const [currentGroupID, _] = useCurrentGroupID();

  const currentGroup = exerciseGroups.groups.find(
    (group) => group.identifier === currentGroupID
  );

  if (!currentGroup) {
    return null;
  }

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newType = e.target.value as ExerciseGroupType;
    currentGroup!.type = newType;
    setExerciseGroups(exerciseGroups);
  }

  return (
    <select
      value={currentGroup.type}
      onChange={onChange}
      className="border border-gray-300 rounded px-3 py-2"
    >
      <option value={ExerciseGroupType.Warmup}>Warmup</option>
      <option value={ExerciseGroupType.Main}>Main</option>
      <option value={ExerciseGroupType.Cooldown}>Cooldown</option>
    </select>
  );
}

function ExerciseList() {
  const [exerciseGroups] = useExerciseGroups();
  const [currentGroupID] = useCurrentGroupID();

  if (!currentGroupID) {
    return null;
  }

  const currentGroup = exerciseGroups.groups.find(
    (group) => group.identifier === currentGroupID
  );
  if (!currentGroup) {
    return null;
  }

  return (
    <div>
      {currentGroup.exercises.map((exercise) => (
        <ExerciseInfo
          key={exercise.identifier}
          exerciseIdentifier={exercise.identifier}
        />
      ))}
    </div>
  );
}

function ExerciseInfo({ exerciseIdentifier }: { exerciseIdentifier: string }) {
  const [exerciseGroups, setExerciseGroups] = useExerciseGroups();
  const exercise = findExercise(exerciseGroups, exerciseIdentifier)!;

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    exercise.durationSeconds = parseInt(e.target.value);
    setExerciseGroups(exerciseGroups);
  }

  return (
    <div>
      {exercise.name}
      <input
        type="number"
        value={exercise.durationSeconds ?? ""}
        onChange={onChange}
      />
    </div>
  );
}

function AddExercise() {
  const [exerciseGroups, setExerciseGroups] = useExerciseGroups();
  const [currentGroupID, _] = useCurrentGroupID();
  const [newExerciseName, setNewExerciseName] = useState("");

  if (!currentGroupID) {
    return null;
  }
  const currentGroup = exerciseGroups.groups.find(
    (group) => group.identifier === currentGroupID
  );
  if (!currentGroup) {
    return null;
  }

  function addExercise() {
    currentGroup!.exercises.push({
      identifier: getNewIdentifier(),
      name: newExerciseName,
      durationSeconds: 20,
    });
    setExerciseGroups(exerciseGroups);
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

function useExerciseGroups() {
  return useLocalStorageState<ExerciseGroups>("exercises", {
    defaultValue: { groups: [] },
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
    defaultValue: { sets: [] },
  });
}

function generateWorkout(exerciseGroups: ExerciseGroups) {
  const workout: Workout = {
    sets: [],
  };

  addWorkoutSetsFromType(
    workout,
    ExerciseGroupType.Warmup,
    exerciseGroups,
    1,
    1,
    1,
    0
  );
  addWorkoutSetsFromType(
    workout,
    ExerciseGroupType.Main,
    exerciseGroups,
    2,
    2,
    2,
    1
  );
  addWorkoutSetsFromType(
    workout,
    ExerciseGroupType.Cooldown,
    exerciseGroups,
    1,
    1,
    1,
    0
  );

  return workout;
}

function addWorkoutSetsFromType(
  workout: Workout,
  type: ExerciseGroupType,
  exerciseGroups: ExerciseGroups,
  groupsNum: number,
  exercisesNum: number,
  minSetsNum: number,
  variationSetsNum: number
) {
  const filteredGroups = exerciseGroups.groups.filter(
    (group) => group.type === type
  );
  const usedGroups = randomChoiceUniqueN(filteredGroups, groupsNum);
  for (const group of usedGroups) {
    const usedExercises = randomChoiceUniqueN(group.exercises, exercisesNum);
    for (const exercise of usedExercises) {
      const setsNum =
        Math.floor(Math.random() * (variationSetsNum + 1)) + minSetsNum;
      for (let i = 0; i < setsNum; i++) {
        workout.sets.push({
          exercise: exercise,
          currentSecond: 0,
        });
      }
    }
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

function randomChoiceUniqueN<T>(array: T[], n: number) {
  const arrayCopy = [...array];
  shuffleArray(arrayCopy);
  return arrayCopy.slice(0, n);
}

function addSecondInWorkout(workout: Workout) {
  for (let set_i = 0; set_i < workout.sets.length; set_i++) {
    const set = workout.sets[set_i];
    const duration = set.exercise.durationSeconds ?? fallbackDuration;
    if (set.currentSecond < duration) {
      if (set_i === 0 && set.currentSecond === 0) {
        say(`[pause] Starting with ${set.exercise.name}!`);
      }
      set.currentSecond += 1;

      if (set_i < workout.sets.length - 1) {
        const nextSet = workout.sets[set_i + 1];
        if (set.currentSecond === duration - 10) {
          if (set.exercise.identifier == nextSet.exercise.identifier) {
            say("[pause] Next up: [pause] Same exercise!");
          } else {
            say(`[pause] Next up: [pause] ${nextSet.exercise.name}!`);
          }
        }
        if (set.currentSecond === duration) {
          say("GO!");
        }
      } else {
        if (set.currentSecond === duration) {
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
