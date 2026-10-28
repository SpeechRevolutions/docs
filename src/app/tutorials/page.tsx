import { HubPage, hubMetadata } from "@/components/HubPage";

export const metadata = hubMetadata("/tutorials");

export default function Page() {
  return <HubPage path="/tutorials" />;
}
