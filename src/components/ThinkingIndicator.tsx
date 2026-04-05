import { useState, useEffect } from 'react';

export type ThinkingStage = 'thinking' | 'searching' | 'calculating' | 'reading' | 'writing';

interface Props {
  visible: boolean;
  stage: ThinkingStage;
  detail?: string;
}

const MESSAGES: Record<ThinkingStage, string[]> = {
  thinking:    ['Thinking…', 'Processing your question…', 'Considering the context…', 'Forming a response…'],
  searching:   ['Searching the web…', 'Looking up latest data…', 'Reading results…', 'Cross-referencing sources…'],
  calculating: ['Running calculations…', 'Applying weather models…', 'Crunching the numbers…', 'Almost there…'],
  reading:     ['Reading weather data…', 'Checking current conditions…', 'Scanning sensor data…', 'Interpreting readings…'],
  writing:     ['Writing response…', 'Putting it together…', 'Formatting output…', 'Almost done…'],
};

const COLORS: Record<ThinkingStage, string> = {
  thinking:    '#3b82f6',
  searching:   '#f59e0b',
  calculating: '#22c55e',
  reading:     '#06b6d4',
  writing:     '#a855f7',
};

export function ThinkingIndicator({ visible, stage, detail }: Props) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => { setMsgIdx(0); }, [stage]);

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setMsgIdx(i => (i + 1) % MESSAGES[stage].length);
        setFade(true);
      }, 280);
    }, 2200);
    return () => clearInterval(interval);
  }, [visible, stage]);

  if (!visible) return null;

  const color = COLORS[stage];
  let msg = MESSAGES[stage][msgIdx];
  if (detail && stage === 'searching' && msgIdx === 1) msg = `Looking up "${detail}"…`;
  if (detail && stage === 'reading'   && msgIdx === 2) msg = `Analysing ${detail}…`;

  return (
    <div className="think-wrap" style={{ animation: 'thinkIn .2s ease' }}>
      <div
        className="think-dot"
        style={{
          background: color,
          boxShadow: `0 0 0 3px ${color}22`,
        }}
      />
      <span
        className="think-text"
        style={{
          opacity: fade ? 1 : 0,
          transform: fade ? 'translateY(0)' : 'translateY(-4px)',
          backgroundImage: `linear-gradient(90deg, ${color} 0%, #ffffff99 50%, ${color} 100%)`,
        }}
      >
        {msg}
      </span>
    </div>
  );
}
