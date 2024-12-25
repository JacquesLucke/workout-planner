import { useState } from "react";
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
}

interface Workout {
  sets: SingleSet[];
}

interface SingleSet {
  exerciseIdentifier: string;
  durationSeconds: number;
}

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
  const [currentWorkout, setCurrentWorkout] = useCurrentWorkout();

  return (
    <>
      <NewWorkout />
      <WorkoutList />
    </>
  );
}

function NewWorkout() {
  const [exerciseGroups] = useExerciseGroups();
  const [_, setCurrentWorkout] = useCurrentWorkout();
  return (
    <button
      onClick={() => setCurrentWorkout(generateWorkout(exerciseGroups))}
      className="w-full bg-blue-500 text-white font-bold p-1 text-center rounded hover:bg-blue-600"
    >
      New Workout
    </button>
  );
}

function WorkoutList() {
  const [currentWorkout] = useCurrentWorkout();

  return (
    <ol>
      {currentWorkout.sets.map((set) => (
        <li key={set.exerciseIdentifier}>
          <WorkoutSet set={set} />
        </li>
      ))}
    </ol>
  );
}

function WorkoutSet({ set }: { set: SingleSet }) {
  const [exerciseGroups] = useExerciseGroups();

  const exercise = findExercise(exerciseGroups, set.exerciseIdentifier);

  return (
    <div className="p-2 bg-slate-400 rounded hover:bg-slate-500">
      {exercise.name}
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
        <div key={exercise.name}>{exercise.name}</div>
      ))}
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

  for (const group of exerciseGroups.groups) {
    for (const exercise of group.exercises) {
      workout.sets.push({
        exerciseIdentifier: exercise.identifier,
        durationSeconds: 30,
      });
    }
  }

  shuffleArray(workout.sets);

  return workout;
}

function findExercise(exerciseGroups: ExerciseGroups, identifier: string) {
  for (const group of exerciseGroups.groups) {
    for (const exercise of group.exercises) {
      if (exercise.identifier === identifier) {
        return exercise;
      }
    }
  }
  throw new Error("Could not find exercise with identifier " + identifier);
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

export default App;
