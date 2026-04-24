import 'package:flutter/material.dart';
import './view/login_screen.dart'; // Importamos tu pantalla de login
import './view/home_screen.dart';  // Importamos la pantalla principal (la crearemos en el paso 2)
import 'package:firebase_core/firebase_core.dart';
void main() async {
  // 1. Esto es OBLIGATORIO. Le dice a Flutter que espere a que el motor nativo esté listo
  WidgetsFlutterBinding.ensureInitialized();

  // 2. Encendemos Firebase antes de hacer cualquier otra cosa
  try {
    await Firebase.initializeApp(
      // options: DefaultFirebaseOptions.currentPlatform, // Usa esto si tienes el archivo firebase_options.dart
    );
    print("✅ Firebase inicializado correctamente");
  } catch (e) {
    print("❌ Error al inicializar Firebase: $e");
  }
  runApp(const MiAppTramites());
}

class MiAppTramites extends StatelessWidget {
  const MiAppTramites({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Seguimiento de Trámites',
      debugShowCheckedModeBanner: false, // Quita la etiqueta roja de "DEBUG"
      
      // Tema global de tu app (oscuro con detalles Teal)
      theme: ThemeData(
        brightness: Brightness.dark,
        primaryColor: Colors.teal,
        scaffoldBackgroundColor: const Color(0xFF141414),
      ),

      // 🚀 EL MAPA DE RUTAS
      initialRoute: '/login', // La primera pantalla que se abre al iniciar la app
      routes: {
        '/login': (context) => const LoginScreen(),
        // Cuando llamemos a '/home', abrirá la pantalla HomeScreen
        '/home': (context) => const HomeScreen(), 
        // Aquí irás agregando más rutas en el futuro:
        // '/detalle': (context) => const DetalleTramiteScreen(),
        // '/historial': (context) => const HistorialScreen(),
      },
    );
  }
}