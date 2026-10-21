import { useLocalSearchParams } from "expo-router";
import Management from "../../../features/Management";
export default function Page() {
  const { resource } = useLocalSearchParams<{ resource: string }>();
  return <Management resource={resource} />;
}
