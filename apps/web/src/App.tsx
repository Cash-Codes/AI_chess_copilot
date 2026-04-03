import { useState } from "react";

function App() {
  const [result, setResult] = useState<string>("");

  const checkApi = async () => {
    const res = await fetch("http://localhost:3001/health");
    const data = await res.json();
    setResult(JSON.stringify(data));
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
