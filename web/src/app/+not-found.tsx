import { router } from 'expo-router';
import { Screen } from '../components/Screen';
import { Button, Empty } from '../components/ui';
export default function NotFound() { return <Screen><Empty title="Página no encontrada" description="Volvé al directorio de NexAccess." action={<Button title="Ver usuarios" onPress={() => router.replace('/')} />} /></Screen>; }
