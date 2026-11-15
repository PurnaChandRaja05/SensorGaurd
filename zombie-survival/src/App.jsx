import { GameProvider, useGame } from './context/GameContext';
import HUD from './components/HUD';
import ZombieBackground from './components/ZombieBackground';
import FieldManual from './components/FieldManual';
import InstructionManual from './components/InstructionManual';
import StartScreen from './components/StartScreen';
import MissionBriefing from './components/MissionBriefing';
import GameOverScreen from './components/GameOverScreen';
import EvacuationScreen from './components/EvacuationScreen';
import Mission1 from './missions/Mission1';
import Mission2 from './missions/Mission2';
import Mission3 from './missions/Mission3';
import Mission4 from './missions/Mission4';
import Mission5 from './missions/Mission5';

const missionComponents = {
  1: Mission1,
  2: Mission2,
  3: Mission3,
  4: Mission4,
  5: Mission5,
};

function GameScreen() {
  const { state } = useGame();

  const renderScreen = () => {
    switch (state.currentScreen) {
      case 'start':
        return <StartScreen />;
      case 'mission-briefing':
        return <MissionBriefing />;
      case 'mission': {
        const MissionComponent = missionComponents[state.currentMission];
        return MissionComponent ? <MissionComponent /> : null;
      }
      case 'game-over':
        return <GameOverScreen />;
      case 'evacuation':
        return <EvacuationScreen />;
      default:
        return <StartScreen />;
    }
  };

  return (
    <div className="scanline min-h-screen relative overflow-x-hidden">
      <ZombieBackground />
      <HUD />
      <FieldManual />
      <InstructionManual />
      <div className={`relative z-10 ${state.currentScreen !== 'start' ? 'pt-14 px-4 pb-6' : ''}`}>
        {renderScreen()}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <GameScreen />
    </GameProvider>
  );
}
