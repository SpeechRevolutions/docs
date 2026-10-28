import { HubPage, hubMetadata } from "@/components/HubPage";

export const metadata = hubMetadata("/integrations");

export default function Page() {
  return <HubPage path="/integrations" />;
}
