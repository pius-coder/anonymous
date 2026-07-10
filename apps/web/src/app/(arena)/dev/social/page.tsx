import { notFound } from "next/navigation";
import SocialLab from "./SocialLab";

export default function SocialLabPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <SocialLab />;
}
