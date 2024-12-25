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

function App() {
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

export default App;
