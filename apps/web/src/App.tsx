import { useState } from "react";

function App() {
  const [result, setResult] = useState<string>("");

  const checkApi = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:3001"}/health`);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = await res.json();
      setResult(JSON.stringify(data));
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>AI Chess Copilot</h1>
      <p>Frontend is running.</p>
      <button onClick={checkApi}>Check API</button>
      <pre>{result}</pre>
    </div>
  );
}

export default App;
