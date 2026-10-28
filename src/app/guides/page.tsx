import { HubPage, hubMetadata } from "@/components/HubPage";

export const metadata = hubMetadata("/guides");

export default function Page() {
  return <HubPage path="/guides" />;
}
