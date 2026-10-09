import { t } from '../utils/i18n';

export function ReadingLoadError({ onRetry, lang, message }: {
  onRetry: () => void;
  lang: string;
  message?: string;
}) {
  return (
    <div className="dw-reading-error">
      <p role="alert">{message || t('scripture_load_failed', lang)}</p>
      <button type="button" className="dw-btn-secondary" onClick={onRetry}>{t('retry_reading', lang)}</button>
    </div>
  );
}
