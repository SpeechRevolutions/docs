import { HubPage, hubMetadata } from "@/components/HubPage";

export const metadata = hubMetadata("/api-reference");

export default function Page() {
  return <HubPage path="/api-reference" />;
}
