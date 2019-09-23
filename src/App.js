import React from 'react';
import styled from "styled-components";

import Board from './Board'
import CustomDrag from './CustomDrag'

const ModeButton = styled.div`
  text-align: center;
  width: 200px;
`

const Header = styled.div`
  color: white;
  background: ${p => p.mode === "Board" ? "#ff6040" : "#4060ff"};
  border: 4px solid ${p => p.mode === "Board" ? "#ff6040" : "#4060ff"};
  display: flex;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  justify-content: space-between;
  line-height: 50px;
  padding-left: 50px;
  font-size: 1rem;

  & > ${ModeButton} {
    background: ${p => p.mode === "Board" ? "#4060ff" : "#ff6040"};
  }
`

const items = Array(15).fill("").map((x, i) => i + 1)

function App() {
  const [mode, setMode] = React.useState('Custom')
  return (
    <div style={{ padding: "100px" }}>
      <Header mode={mode}>
        { mode }
        <ModeButton onClick={(e) => setMode(e.target.innerText)}>{ mode === "Custom" ? "Board" : "Custom" }</ModeButton>
      </Header>
      { mode === "Board"
          ? <Board items={ items } />
          : <CustomDrag items={ items } />
      }
    </div>
  );
}

export default App;
