import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { encodePlanToUrl, exportFloorPlan } from '../../utils/storage/storage';
import type { FloorPlan } from '../../types';
import styles from './QrModal.module.css';

const QR_URL_LIMIT = 3000;

type Props = {
  plan: FloorPlan;
  onClose: () => void;
};

export function ShareModal({ plan, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const url = encodePlanToUrl(plan);
  const qrFits = url.length <= QR_URL_LIMIT;

  useEffect(() => {
    if (qrFits && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, { width: 240 }).catch(console.error);
    }
  }, [url, qrFits]);

  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className={styles.backdrop} onClick={onClose} data-testid="share-modal">
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close share">
          ×
        </button>
        <h3 className={styles.title}>{plan.name}</h3>
        {qrFits ? (
          <canvas ref={canvasRef} data-testid="qr-canvas" />
        ) : (
          <p className={styles.qrNote} data-testid="qr-too-large">
            Plan is too large for a QR code.
          </p>
        )}
        <div className={styles.actions}>
          <button className={styles.actionBtn} onClick={handleCopy} data-testid="copy-link-btn">
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          <button
            className={styles.actionBtn}
            onClick={() => exportFloorPlan(plan)}
            data-testid="download-plan-btn"
          >
            Download file
          </button>
        </div>
      </div>
    </div>
  );
}
