// <mos-text-size>: the shared Text size picker (lib/mos/text-size/mos-text-size.js, served from
// public/multiplyos/mos-text-size.js). Eight steps 50%–150%, live preview, one Save, Cancel and leaving revert.
// Events: `change` (saved) and `cancel`. Attributes: `heading="off"`, `labels` (JSON), `lang`.
import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "mos-text-size": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & { heading?: string; labels?: string };
    }
  }
}
