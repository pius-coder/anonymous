import { notFound } from "next/navigation";
import DevUIShowcase from "./DevUIShowcase";

export default function DevUIPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return <DevUIShowcase />;
}
