import Constants from 'expo-constants';

/**
 * Em desenvolvimento no celular, "localhost" é o próprio aparelho. Sem EXPO_PUBLIC_API_URL,
 * usamos o IP da máquina que roda o Metro (o mesmo do QR code) na porta do backend.
 */
function devMachineUrl(): string | null {
  const hostUri = Constants.expoConfig?.hostUri; // "192.168.0.10:8081"
  if (!hostUri) return null;
  return `http://${hostUri.split(':')[0]}:8080`;
}

// tira a barra final para não gerar "//auth/login"
export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL || devMachineUrl() || 'http://localhost:8080'
).replace(/\/+$/, '');

/** endereço do Nitrate web, para compartilhar links; sem ele, compartilha só o texto */
export const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL?.replace(/\/+$/, '') || null;
