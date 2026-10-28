import { HubPage, hubMetadata } from "@/components/HubPage";

export const metadata = hubMetadata("/sdks");

export default function Page() {
  return <HubPage path="/sdks" />;
}
