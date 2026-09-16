import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FigmaTemplateNavigator } from '@/src/screens/FigmaTemplateNavigator';
import { InventoryProvider } from '@/src/context/InventoryContext';
export default function Prototype() {
  return <InventoryProvider demo><SafeAreaView style={{ flex: 1 }}><View style={{ backgroundColor: '#FFF3CF', padding: 8 }}><Text style={{ textAlign: 'center' }}>Design preview · sample data</Text></View><FigmaTemplateNavigator /></SafeAreaView></InventoryProvider>;
}
