import type { ReactNode } from "react";
import { AlertTriangle, Ban, CheckCircle2, LoaderCircle } from "lucide-react";

type PageStateKind = "loading" | "empty" | "error" | "denied" | "success";

type PageStateProps = {
  kind: PageStateKind;
  title: string;
  message: string;
  action?: ReactNode;
};

const iconByKind = {
  loading: LoaderCircle,
  empty: AlertTriangle,
  error: AlertTriangle,
  denied: Ban,
  success: CheckCircle2,
} satisfies Record<PageStateKind, typeof AlertTriangle>;

export function PageState({ kind, title, message, action }: PageStateProps) {
  const Icon = iconByKind[kind];
  const role = kind === "error" || kind === "denied" ? "alert" : "status";

  return (
    <section className={`page-state page-state--${kind}`} role={role}>
      <Icon aria-hidden="true" size={22} />
      <div>
        <h2>{title}</h2>
        <p>{message}</p>
        {action ? <div className="page-state-action">{action}</div> : null}
      </div>
    </section>
  );
}

