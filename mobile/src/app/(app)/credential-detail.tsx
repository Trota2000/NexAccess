import { useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { useDemo } from "../../stores/demo";
import { ScreenContainer, Card, StatusBadge } from "../../components/ui";
import { credentialStatus, dateTime } from "../../utils/domain";
import { s } from "../../theme";
export default function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, user } = useDemo();
  const c = data.credentials.find(
    (c) => c.id === id && c.employeeId === user?.employeeId,
  );
  return (
    <ScreenContainer title="Detalle de credencial" back>
      {!c ? (
        <Text style={s.text}>No se encontró una credencial de tu perfil.</Text>
      ) : (
        <Card>
          <Text style={s.title}>{c.name}</Text>
          <StatusBadge value={credentialStatus(c)} />
          <Text style={s.text}>Tipo: {c.type}</Text>
          <Text style={s.text}>Identificador: {c.maskedCode}</Text>
          <Text style={s.text}>
            Vencimiento:{" "}
            {c.expiresAt ? dateTime(c.expiresAt) : "Sin vencimiento"}
          </Text>
          <Text style={s.text}>
            Revocación: {c.revokedAt ? dateTime(c.revokedAt) : "No revocada"}
          </Text>
          <Text style={s.muted}>
            Representación visual de demostración. No contiene tokens ni códigos
            NFC utilizables.
          </Text>
        </Card>
      )}
    </ScreenContainer>
  );
}
