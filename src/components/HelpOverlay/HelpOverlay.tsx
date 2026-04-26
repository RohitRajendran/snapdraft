import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap/useFocusTrap';
import styles from './HelpOverlay.module.css';

type Props = {
  onClose: () => void;
};

type PlatformKind = 'mac' | 'windows' | 'other';
type InputProfile = {
  hasTouch: boolean;
  hasKeyboard: boolean;
  platform: PlatformKind;
};

function detectPlatform(): PlatformKind {
  if (typeof navigator === 'undefined') return 'other';

  const nav = navigator as Navigator & {
    userAgentData?: {
      platform?: string;
    };
  };
  const platform = nav.userAgentData?.platform ?? navigator.platform ?? navigator.userAgent ?? '';

  if (/mac/i.test(platform)) return 'mac';
  if (/win/i.test(platform)) return 'windows';
  return 'other';
}

function detectInputProfile(): InputProfile {
  if (typeof window === 'undefined') {
    return { hasTouch: false, hasKeyboard: true, platform: 'other' };
  }

  const hasTouch =
    navigator.maxTouchPoints > 0 || window.matchMedia?.('(any-pointer: coarse)').matches === true;
  const hasFinePointer = window.matchMedia?.('(any-pointer: fine)').matches === true;
  const hasKeyboard = !hasTouch || hasFinePointer;

  return {
    hasTouch,
    hasKeyboard,
    platform: detectPlatform(),
  };
}

function getHelpContent(profile: InputProfile) {
  const isTouchOnly = profile.hasTouch && !profile.hasKeyboard;
  const isKeyboardOnly = profile.hasKeyboard && !profile.hasTouch;
  const supportsBoth = profile.hasTouch && profile.hasKeyboard;
  const undoRedoHint =
    profile.platform === 'mac'
      ? '⌘Z / ⌘⇧Z'
      : profile.platform === 'windows'
        ? 'Ctrl+Z / Ctrl+Shift+Z'
        : 'Ctrl/Cmd+Z / Ctrl/Cmd+Shift+Z';

  const gettingStarted = isTouchOnly
    ? [
        {
          action: 'Draw walls',
          hint: 'Wall tool — tap points; use Done, Cancel, and Length to tune the last wall.',
        },
        { action: 'Draw boxes', hint: 'Box tool — drag to create.' },
        { action: 'Select and edit', hint: 'Select tool — tap an item to edit.' },
        { action: 'Measure', hint: 'Measure tool — tap two points.' },
      ]
    : isKeyboardOnly
      ? [
          { action: 'Draw walls', hint: 'Wall tool — drag or click points.' },
          { action: 'Draw boxes', hint: 'Box tool — drag to create.' },
          { action: 'Select and edit', hint: 'Select tool — click an item to edit.' },
          { action: 'Measure', hint: 'Measure tool — click two points.' },
        ]
      : [
          {
            action: 'Draw walls',
            hint: 'Wall tool — tap, click, or drag points; use Done, Cancel, and Length on touch.',
          },
          { action: 'Draw boxes', hint: 'Box tool — drag to create.' },
          { action: 'Select and edit', hint: 'Select tool — tap or click an item to edit.' },
          { action: 'Measure', hint: 'Measure tool — tap or click two points.' },
        ];

  const advancedShortcuts = [
    {
      action: 'Select tool',
      hint: isTouchOnly ? 'Tap Select' : supportsBoth ? 'S or tap Select' : 'S',
    },
    {
      action: 'Wall tool',
      hint: isTouchOnly ? 'Tap Wall' : supportsBoth ? 'W or tap Wall' : 'W',
    },
    {
      action: 'Box tool',
      hint: isTouchOnly ? 'Tap Box' : supportsBoth ? 'B or tap Box' : 'B',
    },
    {
      action: 'Measure tool',
      hint: isTouchOnly ? 'Tap Measure' : supportsBoth ? 'M or tap Measure' : 'M',
    },
    {
      action: 'Exact wall length',
      hint: isTouchOnly
        ? 'Tap Length to edit the last wall.'
        : supportsBoth
          ? "Type 10' or 5'6\" while drawing, or tap Length on touch to edit the last wall."
          : "Type 10' or 5'6\" while drawing.",
    },
    {
      action: 'End wall chain',
      hint: isTouchOnly
        ? 'Tap Done, tap the last point, or double-tap the last point.'
        : supportsBoth
          ? 'Click or tap the last point, tap Done on touch, double-tap, or Esc.'
          : 'Click the last point or press Esc.',
    },
    {
      action: 'Multi-select',
      hint: isTouchOnly ? 'Select tool — drag a marquee.' : 'Drag a marquee or Shift+click items.',
    },
    {
      action: 'Move selected',
      hint: isTouchOnly ? 'Drag selected items.' : 'Drag or use arrow keys.',
    },
    ...(isTouchOnly ? [] : [{ action: 'Fine nudge', hint: 'Shift + Arrow key.' }]),
    {
      action: 'Delete item',
      hint: isTouchOnly ? 'Tap the trash button.' : 'Backspace, Delete, or trash button.',
    },
    ...(isTouchOnly ? [] : [{ action: 'Undo / Redo', hint: undoRedoHint }]),
    {
      action: 'Pan and zoom',
      hint: isTouchOnly
        ? 'Pinch to zoom and use two fingers to pan.'
        : supportsBoth
          ? 'Pinch or Ctrl + scroll to zoom; two fingers to pan.'
          : 'Two-finger scroll or Ctrl + scroll.',
    },
    {
      action: 'Fit content',
      hint: isTouchOnly ? 'Tap Fit.' : supportsBoth ? 'F or tap Fit.' : 'F',
    },
    {
      action: 'Wall snap',
      hint: isTouchOnly ? 'Walls snap by 1".' : 'Walls snap by 1"; hold Shift for 1/4".',
    },
  ];

  const dismissHint = isTouchOnly
    ? 'tap anywhere to dismiss'
    : supportsBoth
      ? 'tap anywhere or press Escape to dismiss'
      : 'press Escape to dismiss';
  const reopenHint = isKeyboardOnly || supportsBoth ? ' · ? to reopen' : '';

  return { gettingStarted, advancedShortcuts, dismissHint: `${dismissHint}${reopenHint}` };
}

const titleId = 'help-overlay-title';

export function HelpOverlay({ onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'help' | 'about'>('help');
  const { gettingStarted, advancedShortcuts, dismissHint } = getHelpContent(detectInputProfile());

  useFocusTrap(cardRef, onClose);

  return (
    <div className={styles.backdrop} onClick={onClose} data-testid="help-overlay">
      <div
        ref={cardRef}
        className={styles.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <span id={titleId} className={styles.title}>
            SnapDraft
          </span>
          <button className={styles.close} onClick={onClose} aria-label="Close help">
            <X size={16} />
          </button>
        </div>

        <div className={styles.tabs} role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'help'}
            className={`${styles.tab} ${activeTab === 'help' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('help')}
          >
            Help
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'about'}
            className={`${styles.tab} ${activeTab === 'about' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('about')}
          >
            About
          </button>
        </div>

        {activeTab === 'help' && (
          <>
            <p className={styles.subtitle}>Sketch floor plans right in your browser.</p>
            <dl className={styles.grid}>
              {gettingStarted.map(({ action, hint }) => (
                <div key={action} className={styles.row}>
                  <dt className={styles.hint}>{action}</dt>
                  <dd className={styles.action}>{hint}</dd>
                </div>
              ))}
            </dl>
            <div className={styles.notice} data-testid="help-save-note">
              Your work is saved automatically in this browser on this device.
            </div>
            <details className={styles.advanced}>
              <summary className={styles.advancedSummary}>Advanced shortcuts and tips</summary>
              <dl className={styles.grid}>
                {advancedShortcuts.map(({ action, hint }) => (
                  <div key={action} className={styles.row}>
                    <dt className={styles.hint}>{action}</dt>
                    <dd className={styles.action}>{hint}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </>
        )}

        {activeTab === 'about' && (
          <div className={styles.about}>
            <p className={styles.aboutText}>Hey,</p>
            <p className={styles.aboutText}>
              My wife is an architect (the building kind, not the software kind). Whenever we need
              to plan anything for our home, she pulls up Revit. It&apos;s been amazing for things
              like our kitchen renovation, but it&apos;s a lot for simpler things like experimenting
              with furniture layouts or making sure the side table we spotted at IKEA would actually
              fit.
            </p>
            <p className={styles.aboutText}>
              I tried a few apps and websites. Everything was either too expensive or more than I
              was really looking for. So I built SnapDraft: something quick, simple, and easy enough
              for a non-architect like me to use and pull up from anywhere.
            </p>
            <p className={styles.aboutText}>Hope it&apos;s useful for you too.</p>
            <div className={styles.aboutSignoff}>
              <p className={styles.aboutText}>— Rohit</p>
              <p className={styles.aboutText}>
                P.S. If you have feedback, I&apos;d love to hear it!
              </p>
              <div className={styles.aboutLinks}>
                <a
                  href="https://github.com/RohitRajendran/snapdraft"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.aboutLink}
                >
                  GitHub
                </a>
                <a
                  href="mailto:rohit@hummingbirdtech.xyz?subject=SnapDraft"
                  className={styles.aboutLink}
                >
                  Email
                </a>
              </div>
            </div>
          </div>
        )}

        <div className={styles.footer}>
          <button className={styles.startBtn} onClick={onClose}>
            Start drawing
          </button>
          <span className={styles.dismiss}>or {dismissHint}</span>
        </div>
      </div>
    </div>
  );
}
