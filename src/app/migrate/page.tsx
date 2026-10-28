import { HubPage, hubMetadata } from "@/components/HubPage";

export const metadata = hubMetadata("/migrate");

export default function Page() {
  return <HubPage path="/migrate" />;
}
