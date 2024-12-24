import { useState } from "react";
import useLocalStorageState from "use-local-storage-state";

function App() {
  const [todos, setTodos] = useLocalStorageState<string[]>("todos", {
    defaultValue: [],
  });

  const [query, setQuery] = useState("");

  function onClick() {
    setTodos([...todos, query]);
    setQuery("");
  }

  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <button onClick={onClick}>Add</button>
      <ul>
        {todos.map((todo) => (
          <li key={todo}>{todo}</li>
        ))}
      </ul>
    </>
  );
}

export default App;
