import type { ReactNode } from "react";
import { Activity } from "lucide-react";

type LifecycleBannerProps = {
  status: string;
  detail: string;
  meta?: ReactNode;
};

export function LifecycleBanner({ status, detail, meta }: LifecycleBannerProps) {
  return (
    <section className="lifecycle-banner" role="status" aria-live="polite">
      <div className="lifecycle-main">
        <Activity aria-hidden="true" size={18} />
        <div>
          <p className="label">Phase courante</p>
          <strong>{status}</strong>
        </div>
      </div>
      <p>{detail}</p>
      {meta ? <div className="lifecycle-meta">{meta}</div> : null}
    </section>
  );
}

