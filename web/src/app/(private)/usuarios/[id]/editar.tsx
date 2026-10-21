import { useLocalSearchParams } from 'expo-router';
import UserForm from '../../../../features/users/UserForm';
export default function EditUser() { const { id } = useLocalSearchParams<{ id: string }>(); return <UserForm id={id} />; }
