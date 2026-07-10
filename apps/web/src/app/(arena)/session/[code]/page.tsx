import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SessionService } from "@/services/sessions/SessionService";
import { SessionDetailContent } from "@/components/public/SessionDetailContent";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const sessionService = new SessionService();
  const session = await sessionService.getDetail(code);
  if (!session) return { title: "Session introuvable" };

  return {
    title: `${session.name} | Session Jeu`,
    description: session.description || `Session ${session.name}`,
    openGraph: {
      title: session.name,
      description: session.description || "",
      type: "website",
    },
  };
}

export default async function SessionDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const sessionService = new SessionService();
  const session = await sessionService.getDetail(code);

  if (!session) notFound();

  return <SessionDetailContent session={session} code={code} />;
}
