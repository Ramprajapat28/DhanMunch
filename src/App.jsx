import { useState } from "react";

import "./App.css";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex flex-col h-[100vh] w-full">
      <div className="text flex flex-col">
        <h1>Catch the Items</h1>
        <p></p>
      </div>
      <div className="canvas"></div>
    </div>
  );
}

export default App;
