import { HubPage, hubMetadata } from "@/components/HubPage";

export const metadata = hubMetadata("/api-reference/endpoints");

export default function Page() {
  return <HubPage path="/api-reference/endpoints" />;
}
