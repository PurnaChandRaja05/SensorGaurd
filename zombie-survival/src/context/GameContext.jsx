import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { soundEngine } from '../utils/soundEngine';

const GameContext = createContext(null);

const INITIAL_STATE = {
  health: 100,
  food: 100,
  medicine: 100,
  fuel: 100,
  currentScreen: 'start',
  currentMission: 1,
  missionResults: [],
  fieldManualOpen: false,
  instructionManualOpen: false,
  musicEnabled: true,
  sfxEnabled: true,
  soundMuted: false,
  hudFeedback: null, // 'penalty' | 'reward' | null
};

function clamp(val, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(val)));
}

function gameReducer(state, action) {
  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, currentScreen: action.screen };

    case 'APPLY_PENALTY': {
      const next = {
        ...state,
        health: clamp(state.health - (action.health || 0)),
        food: clamp(state.food - (action.food || 0)),
        medicine: clamp(state.medicine - (action.medicine || 0)),
        fuel: clamp(state.fuel - (action.fuel || 0)),
        hudFeedback: 'penalty',
      };
      soundEngine.playAlarm();
      soundEngine.playZombieGroan();
      if (next.health <= 0 || (next.food <= 0 && next.medicine <= 0 && next.fuel <= 0)) {
        return { ...next, currentScreen: 'game-over' };
      }
      return next;
    }

    case 'APPLY_REWARD': {
      soundEngine.playSuccessChime();
      return {
        ...state,
        health: clamp(state.health + (action.health || 0)),
        food: clamp(state.food + (action.food || 0)),
        medicine: clamp(state.medicine + (action.medicine || 0)),
        fuel: clamp(state.fuel + (action.fuel || 0)),
        hudFeedback: 'reward',
      };
    }

    case 'CLEAR_HUD_FEEDBACK':
      return { ...state, hudFeedback: null };

    case 'COMPLETE_MISSION': {
      const currentMissionNum = action.mission ?? state.currentMission;
      const result = {
        mission: currentMissionNum,
        score: action.score,
        summary: action.summary,
      };
      const nextMission = action.nextMission ?? (currentMissionNum + 1);
      const nextResults = [...state.missionResults, result];

      soundEngine.playFanfare();

      if (nextMission > 5) {
        return {
          ...state,
          missionResults: nextResults,
          currentScreen: 'evacuation',
        };
      }
      return {
        ...state,
        currentMission: nextMission,
        missionResults: nextResults,
        currentScreen: 'mission-briefing',
      };
    }

    case 'START_MISSION':
      soundEngine.playClick();
      return { ...state, currentScreen: 'mission' };

    case 'TOGGLE_FIELD_MANUAL':
      soundEngine.playClick();
      return { ...state, fieldManualOpen: !state.fieldManualOpen };

    case 'CLOSE_FIELD_MANUAL':
      return { ...state, fieldManualOpen: false };

    case 'TOGGLE_INSTRUCTION_MANUAL':
      soundEngine.playClick();
      return { ...state, instructionManualOpen: !state.instructionManualOpen };

    case 'OPEN_INSTRUCTION_MANUAL':
      soundEngine.playClick();
      return { ...state, instructionManualOpen: true };

    case 'CLOSE_INSTRUCTION_MANUAL':
      return { ...state, instructionManualOpen: false };

    case 'TOGGLE_MUSIC': {
      const nextMusic = soundEngine.toggleMusic();
      return { ...state, musicEnabled: nextMusic };
    }

    case 'TOGGLE_SFX': {
      const nextSfx = soundEngine.toggleSfx();
      return { ...state, sfxEnabled: nextSfx };
    }

    case 'TOGGLE_MUTE': {
      const nextMuted = soundEngine.toggleMute();
      if (!nextMuted) {
        soundEngine.playClick();
      }
      return {
        ...state,
        soundMuted: nextMuted,
        sfxEnabled: !nextMuted,
        musicEnabled: !nextMuted,
      };
    }

    case 'RESTART_GAME':
      soundEngine.playClick();
      return {
        ...INITIAL_STATE,
        soundMuted: state.soundMuted,
        sfxEnabled: state.sfxEnabled,
        musicEnabled: state.musicEnabled,
      };

    case 'RETRY_MISSION':
      soundEngine.playClick();
      return {
        ...state,
        health: Math.max(state.health, 30),
        food: Math.max(state.food, 20),
        medicine: Math.max(state.medicine, 20),
        fuel: Math.max(state.fuel, 20),
        currentScreen: 'mission-briefing',
      };

    case 'START_GAME':
      soundEngine.playClick();
      return { ...state, currentScreen: 'mission-briefing', currentMission: 1 };

    default:
      return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE);

  // Clear HUD flash after 1.2 seconds
  useEffect(() => {
    if (state.hudFeedback) {
      const t = setTimeout(() => {
        dispatch({ type: 'CLEAR_HUD_FEEDBACK' });
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [state.hudFeedback]);

  const applyPenalty = useCallback((penalties) => {
    dispatch({ type: 'APPLY_PENALTY', ...penalties });
  }, []);

  const applyReward = useCallback((rewards) => {
    dispatch({ type: 'APPLY_REWARD', ...rewards });
  }, []);

  const completeMission = useCallback((score, summary, extra = {}) => {
    dispatch({ type: 'COMPLETE_MISSION', score, summary, ...extra });
  }, []);

  if (typeof window !== 'undefined') {
    window.__GAME_DEBUG__ = {
      state,
      dispatch,
      setMission: (m, screen = 'mission') => {
        dispatch({ type: 'COMPLETE_MISSION', score: 100, summary: 'Debug advance', mission: m - 1, nextMission: m });
        if (screen === 'mission') {
          dispatch({ type: 'START_MISSION' });
        }
      },
    };
  }

  const value = { state, dispatch, applyPenalty, applyReward, completeMission };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
