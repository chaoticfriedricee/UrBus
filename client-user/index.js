// index.js
import { registerRootComponent } from 'expo';
// Registra la tarea de ubicación en segundo plano antes de montar la app: Android puede
// ejecutarla al arrancar y TaskManager exige que esté definida desde el inicio
import './src/features/bus/services/backgroundLocation';
import App from './App';

registerRootComponent(App);
