import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  // ⚠️ ATENCIÓN: Si usas el emulador de Android, localhost no funciona. 
  // Debes usar 10.0.2.2. Si usas iOS o Web, deja localhost.
  static const String baseUrl = 'http://192.168.1.41:8080/api/profiles'; 

  Future<Map<String, dynamic>> loginConToken(String token) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/login'),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: jsonEncode({
          'token': token.trim(), // Enviamos el JSON exacto
        }),
      );

      final Map<String, dynamic> responseData = jsonDecode(response.body);

      // Si el login fue exitoso (Código 200)
      if (response.statusCode == 200) {
        return responseData; 
      } 
      // Manejo de errores específicos del backend (400, 401, 403)
      else {
        throw Exception(responseData['message'] ?? 'Error desconocido al iniciar sesión');
      }
    } catch (e) {
      throw Exception('Error de conexión: $e');
    }
  }



  // 🚀 NUEVO: Método para enviar el FCM Token al backend
  Future<void> updateFcmToken(String accessToken, String fcmToken) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/update-fcm-token'),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: jsonEncode({
          'accessToken': accessToken, // El token que usaste para hacer login
          'fcmToken': fcmToken,       // El token único del celular
        }),
      );

      if (response.statusCode != 200) {
        // Solo lanzamos error si falla, el éxito es silencioso para el usuario
        print('Error al guardar FCM Token en BD: ${response.body}');
      } else {
        print('✅ FCM Token guardado exitosamente en el servidor.');
      }
    } catch (e) {
      print('Excepción al enviar FCM Token: $e');
    }
  }



// 🚀 NUEVO: Obtener la lista de trámites del usuario
  Future<List<dynamic>> obtenerTramites(String profileId) async {
    try {
      // Ajusta la URL si tu controlador se llama /api/instances o /api/profiles
      final url = Uri.parse('$baseUrl/profile/$profileId');
      
      final response = await http.get(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body); // Devuelve la lista JSON
      } else {
        throw Exception('Error al cargar historial: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error de conexión: $e');
    }
  }

}