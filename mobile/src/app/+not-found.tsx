import { Link } from "expo-router";
import { ScreenContainer } from "../components/ui";
export default function NotFound() {
  return (
    <ScreenContainer title="Página no encontrada">
      <Link href="/">Volver al inicio</Link>
    </ScreenContainer>
  );
}
