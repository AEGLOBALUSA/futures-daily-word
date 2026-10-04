import { useEffect, useRef, useState } from 'react';
import { t } from '../utils/i18n';

export function NextPill({ quietWhileReading = false }: { quietWhileReading?: boolean }) {
  const quietWhileReadingRef = useRef(quietWhileReading);
  const [next, setNext] = useState<HTMLElement | null>(null);
  const [offScreen, setOffScreen] = useState(false);
  const [label, setLabel] = useState('');
  const [quiet, setQuiet] = useState(false);

  useEffect(() => {
    quietWhileReadingRef.current = quietWhileReading;
    setQuiet(quietWhileReading && document.body.classList.contains('dw-reading-active'));
  }, [quietWhileReading]);

  useEffect(() => {
    let observed: HTMLElement | null = null;
    let targetMutations: MutationObserver | null = null;
    let targetIntersection: IntersectionObserver | null = null;
    const readLabel = (element: HTMLElement) => element.innerText?.trim() || element.textContent?.trim() || '';
    const update = () => {
      if (!observed) return;
      setQuiet(quietWhileReadingRef.current && document.body.classList.contains('dw-reading-active'));
      const rect = observed.getBoundingClientRect();
      const tabTop = document.querySelector<HTMLElement>('.tab-bar')?.getBoundingClientRect().top ?? window.innerHeight;
      const topChromeBottom = Array.from(document.querySelectorAll<HTMLElement>('.dw-seam-bar, header'))
        .filter(element => ['fixed', 'sticky'].includes(window.getComputedStyle(element).position))
        .reduce((bottom, element) => Math.max(bottom, element.getBoundingClientRect().bottom), 0);
      const readingTop = document.body.classList.contains('dw-reading-active')
        ? document.querySelector<HTMLElement>('.dw-reading-bar')?.getBoundingClientRect().top ?? window.innerHeight
        : window.innerHeight;
      setLabel(readLabel(observed));
      setOffScreen(!(rect.top >= topChromeBottom && rect.bottom <= Math.min(tabTop, readingTop)));
    };
    const findNext = () => {
      const element = document.querySelector<HTMLElement>('.dw-next');
      if (element === observed) {
        update();
        return;
      }
      targetMutations?.disconnect();
      targetIntersection?.disconnect();
      observed = element;
      setNext(element);
      if (element) {
        targetMutations = new MutationObserver(update);
        targetMutations.observe(element, { characterData: true, childList: true, subtree: true });
        targetIntersection = new IntersectionObserver(update, { threshold: 0.1, root: null });
        targetIntersection.observe(element);
      }
      update();
    };
    const mutations = new MutationObserver(findNext);
    mutations.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    findNext();
    const scrollOptions = { passive: true, capture: true } as AddEventListenerOptions;
    document.addEventListener('scroll', update, scrollOptions);
    window.addEventListener('resize', update);
    return () => {
      mutations.disconnect();
      targetMutations?.disconnect();
      targetIntersection?.disconnect();
      document.removeEventListener('scroll', update, scrollOptions);
      window.removeEventListener('resize', update);
    };
  }, []);

  if (quiet || !next || !offScreen || !label) return null;
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  return (
    <button
      type="button"
      className="dw-next-pill"
      onClick={() => {
        next.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        next.focus({ preventScroll: true });
      }}
      aria-label={`${t('next_pill')}: ${label}`}
    >
      {t('next_pill')}: {label}
    </button>
  );
}
