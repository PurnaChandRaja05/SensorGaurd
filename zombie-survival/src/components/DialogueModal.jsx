import { useState, useEffect, useRef } from 'react';
import { soundEngine } from '../utils/soundEngine';
import {
  Radio,
  FlaskConical,
  Crosshair,
  Package,
  Truck,
  Volume2,
  ChevronRight,
  X,
  FastForward,
} from 'lucide-react';

const CHARACTERS = {
  vance: {
    name: 'COMMANDER VANCE',
    callsign: 'OUTPOST ECHO',
    title: 'Operations Command',
    icon: Radio,
    color: 'text-amber-400',
    borderColor: 'border-amber-500/40',
    bgColor: 'bg-amber-950/40',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  aris: {
    name: 'DR. ELENA ARIS',
    callsign: 'BIO-MED 1',
    title: 'Field Epidemiologist',
    icon: FlaskConical,
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/40',
    bgColor: 'bg-emerald-950/40',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  maya: {
    name: 'SCOUT MAYA',
    callsign: 'DRONE RECON',
    title: 'Aerial Recon Specialist',
    icon: Crosshair,
    color: 'text-sky-400',
    borderColor: 'border-sky-500/40',
    bgColor: 'bg-sky-950/40',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  },
  cole: {
    name: 'PILOT COLE',
    callsign: 'AIR-DROP 7',
    title: 'C-130 Flight Lead',
    icon: Package,
    color: 'text-orange-400',
    borderColor: 'border-orange-500/40',
    bgColor: 'bg-orange-950/40',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  },
  jax: {
    name: 'DRIVER JAX',
    callsign: 'WAR-RIG 1',
    title: 'Convoy Wheelman',
    icon: Truck,
    color: 'text-red-400',
    borderColor: 'border-red-500/40',
    bgColor: 'bg-red-950/40',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
  },
};

export default function DialogueModal({
  isOpen,
  onClose,
  character = 'vance',
  messages = [],
  locationTag = 'TACTICAL FREQUENCY: 142.85 MHz',
}) {
  const [currentMsgIdx, setCurrentMsgIdx] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const timerRef = useRef(null);

  const charConfig = CHARACTERS[character] || CHARACTERS.vance;
  const IconComponent = charConfig.icon;

  const currentMessage = Array.isArray(messages)
    ? messages[currentMsgIdx] || ''
    : messages || '';

  // Reset state on modal open or message index change
  useEffect(() => {
    if (!isOpen) return;

    soundEngine.playRadioChirp();
    setDisplayedText('');
    setIsTyping(true);

    let charIndex = 0;
    const fullText = currentMessage;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      if (charIndex < fullText.length) {
        setDisplayedText(fullText.slice(0, charIndex + 1));
        charIndex++;
      } else {
        setIsTyping(false);
        clearInterval(timerRef.current);
      }
    }, 20);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, currentMsgIdx, currentMessage]);

  if (!isOpen) return null;

  const handleSkipOrNext = () => {
    soundEngine.playClick();
    if (isTyping) {
      // Instantly reveal all text
      if (timerRef.current) clearInterval(timerRef.current);
      setDisplayedText(currentMessage);
      setIsTyping(false);
    } else {
      // Advance to next message or close
      if (Array.isArray(messages) && currentMsgIdx < messages.length - 1) {
        setCurrentMsgIdx((prev) => prev + 1);
      } else {
        setCurrentMsgIdx(0);
        onClose();
      }
    }
  };

  const handleClose = () => {
    soundEngine.playClick();
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrentMsgIdx(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6 pointer-events-auto">
      {/* Semi-transparent tactical backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={handleClose}
      />

      {/* Radio Transmission Dialog */}
      <div className={`relative w-full max-w-2xl bg-zinc-950/95 border-2 ${charConfig.borderColor} rounded-xl shadow-2xl p-4 sm:p-6 hud-glow fade-in`}>
        {/* Top frequency banner */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800 text-[10px] sm:text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-400 font-bold uppercase tracking-wider">
              RADIO TRANSMISSION // {charConfig.callsign}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-zinc-500">{locationTag}</span>
            <button
              onClick={handleClose}
              className="p-1 hover:text-zinc-200 text-zinc-500 rounded transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Character Card & Message Content */}
        <div className="flex items-start gap-4">
          {/* Character Portrait Box */}
          <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-lg ${charConfig.bgColor} border ${charConfig.borderColor} flex flex-col items-center justify-center shrink-0 p-1 relative overflow-hidden shadow-inner`}>
            <IconComponent className={`w-8 h-8 sm:w-10 sm:h-10 ${charConfig.color}`} />
            <span className="text-[9px] font-mono text-zinc-400 mt-1 uppercase text-center leading-tight">
              {charConfig.callsign.split(' ')[0]}
            </span>
            {/* Corner tactical tick marks */}
            <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-zinc-500" />
            <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-zinc-500" />
            <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-zinc-500" />
            <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-zinc-500" />
          </div>

          {/* Message Text Body */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-xs sm:text-sm font-bold font-mono ${charConfig.color}`}>
                {charConfig.name}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${charConfig.badgeColor}`}>
                {charConfig.title}
              </span>
            </div>

            {/* Typewriter message box */}
            <div className="min-h-[68px] sm:min-h-[76px] bg-zinc-900/80 border border-zinc-800 rounded-lg p-3 text-xs sm:text-sm text-zinc-200 font-mono leading-relaxed relative">
              <p>
                {displayedText}
                {isTyping && <span className="inline-block w-1.5 h-3.5 bg-amber-400 ml-1 animate-pulse" />}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom controls */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-800 text-xs font-mono">
          <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
            <span>Audio Comms Active</span>
            {Array.isArray(messages) && messages.length > 1 && (
              <span className="ml-2 text-zinc-400">
                ({currentMsgIdx + 1}/{messages.length})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isTyping ? (
              <button
                onClick={handleSkipOrNext}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 cursor-pointer"
              >
                <FastForward className="w-3.5 h-3.5" /> Skip Typing
              </button>
            ) : (
              <button
                onClick={handleSkipOrNext}
                className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5 cursor-pointer font-bold"
              >
                {Array.isArray(messages) && currentMsgIdx < messages.length - 1
                  ? 'Next Transmission'
                  : 'Acknowledge & Close'}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

