import { useState, useEffect } from "react";
import useLocalStorageState from "use-local-storage-state";

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

let isPlaying = false;

function App() {
  return (
    <>
      <Tabs />
      <CurrentTab />
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
      <WorkoutList />
    </>
  );
}

function PlayPause() {
  const [dummyCounter, setDummyCounter] = useState(0);
  function toggleIsPlaying() {
    isPlaying = !isPlaying;
    setDummyCounter(dummyCounter + 1);
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

function NewWorkout() {
  const [exerciseGroups] = useExerciseGroups();
  const [_, setCurrentWorkout] = useCurrentWorkout();

  function updateWorkout() {
    setCurrentWorkout(generateWorkout(exerciseGroups));
    isPlaying = false;
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

  const [counter, setCounter] = useState(0);
  useEffect(() => {
    setTimeout(() => {
      if (isPlaying) {
        addSecondInWorkout(currentWorkout);
        setCurrentWorkout(currentWorkout);
      }
      setCounter(counter + 1);
    }, 1000);
  }, [counter]);

  return (
    <ol>
      {currentWorkout.sets.map((set, i) => (
        <li key={i}>{<WorkoutSet set={set} />}</li>
      ))}
    </ol>
  );
}

function WorkoutSet({ set }: { set: SingleSet }) {
  return (
    <div className="p-2 bg-slate-400 rounded hover:bg-slate-500 relative">
      {set.exercise.name} {set.currentSecond} /{" "}
      {set.exercise.durationSeconds ?? fallbackDuration}
    </div>
  );
}

function Settings() {
  return (
    <>
      <AddExerciseGroup />
      <SelectExerciseGroup />
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

  let usedGroups = randomChoiceUniqueN(exerciseGroups.groups, 2);

  for (const group of usedGroups) {
    const usedExercises = randomChoiceUniqueN(group.exercises, 2);
    for (const exercise of usedExercises) {
      const setsNum = Math.floor(Math.random() * 2) + 2;
      for (let i = 0; i < setsNum; i++) {
        workout.sets.push({
          exercise: exercise,
          currentSecond: 0,
        });
      }
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
  for (let set_i = 0; set_i < workout.sets.length - 1; set_i++) {
    const set = workout.sets[set_i];
    const duration = set.exercise.durationSeconds ?? fallbackDuration;
    if (set.currentSecond < duration) {
      set.currentSecond += 1;

      if (set_i < workout.sets.length - 1) {
        const nextSet = workout.sets[set_i + 1];
        if (set.currentSecond === duration - 10) {
          say("Next up: " + nextSet.exercise.name);
        }
        if (set.currentSecond === duration) {
          say("Go!");
        }
      } else {
        if (set.currentSecond === duration) {
          say("Done!");
          isPlaying = false;
        }
      }
      return;
    }
  }
}

function say(text: string) {
  const msg = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(msg);
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
