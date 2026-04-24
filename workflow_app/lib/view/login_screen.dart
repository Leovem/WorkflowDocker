import 'package:flutter/material.dart';
import '../services/api_service.dart'; // Importa tu servicio
import 'package:firebase_messaging/firebase_messaging.dart'; // 🚀 Importa esto

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _tokenController = TextEditingController();
  final ApiService _apiService = ApiService();
  
  bool _isLoading = false; // Controla el circulito de carga

  // Método que se ejecuta al presionar el botón
  Future<void> _iniciarSesion() async {
    final String token = _tokenController.text;

    if (token.isEmpty) {
      _mostrarMensaje('Por favor, ingresa tu código de acceso', isError: true);
      return;
    }

    setState(() {
      _isLoading = true; // Empieza a cargar
    });

    try {
      // Llamamos a nuestro backend
      final respuesta = await _apiService.loginConToken(token);
      
      // Si llegamos aquí, el backend dio un código 200 OK.
      final perfil = respuesta['profile'];
      
      _mostrarMensaje('¡Bienvenido ${perfil['name']}!', isError: false);

      try {
        // A) Pedimos permiso (Vital para iOS, en Android 13+ también es buena práctica)
        FirebaseMessaging messaging = FirebaseMessaging.instance;
        await messaging.requestPermission();

        // B) Obtenemos el "número de teléfono" de este celular
        String? fcmToken = await messaging.getToken();
        
        if (fcmToken != null) {
          print("📱 Token FCM obtenido del celular: $fcmToken");
          // C) Lo enviamos a tu Spring Boot
          await _apiService.updateFcmToken(token, fcmToken);
        } else {
          print("⚠️ Firebase no pudo generar el token FCM en este momento.");
          print("-----------------==================================");
          print("-----------------==================================");
          print("-----------------==================================");
          print("-----------------==================================");
        }
      } catch (firebaseError) {
        // Envolvemos esto en su propio try-catch para que si Firebase falla
        // por falta de configuración, NO le bloquee el acceso a la app al usuario.
        print("Error configurando notificaciones: $firebaseError");
      }

      if (mounted) {
        Navigator.pushReplacementNamed(
          context, 
          '/home', 
          arguments: perfil['id'], // Le pasamos el ID a la siguiente pantalla
        );
      }
      
      // TODO: Aquí puedes usar Navigator.pushReplacement para llevarlo
      // a la pantalla principal del trámite, pasándole el ID del perfil.
      print("ID del perfil para usar después: ${perfil['id']}");

    } catch (e) {
      // Atrapamos los mensajes del backend (Token inválido, expirado, etc)
      _mostrarMensaje(e.toString().replaceAll('Exception: ', ''), isError: true);
    } finally {
      setState(() {
        _isLoading = false; // Termina de cargar
      });
    }
  }

  // Método ayudante para mostrar notificaciones (SnackBars)
  void _mostrarMensaje(String mensaje, {required bool isError}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(mensaje),
        backgroundColor: isError ? Colors.redAccent : Colors.teal,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF141414), // Fondo oscuro estilo tu web
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Icono / Logo
              const Icon(
                Icons.security_rounded,
                size: 80,
                color: Colors.tealAccent,
              ),
              const SizedBox(height: 24),
              
              // Títulos
              const Text(
                'Seguimiento de Trámite',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Ingresa tu código de acceso único',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.white54,
                ),
              ),
              const SizedBox(height: 40),

              // Campo de Texto para el Token
              TextField(
                controller: _tokenController,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  labelText: 'Token de acceso',
                  labelStyle: const TextStyle(color: Colors.white54),
                  hintText: 'Ej. a1b2c3d4...',
                  hintStyle: const TextStyle(color: Colors.white24),
                  filled: true,
                  fillColor: const Color(0xFF1A1A1A),
                  prefixIcon: const Icon(Icons.key, color: Colors.tealAccent),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Colors.white12),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Colors.tealAccent),
                  ),
                ),
              ),
              const SizedBox(height: 32),

              // Botón de Enviar
              SizedBox(
                height: 55,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _iniciarSesion,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.teal,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: _isLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text(
                          'Ingresar',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _tokenController.dispose();
    super.dispose();
  }
}