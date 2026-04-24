import 'package:flutter/material.dart';
import '../services//api_service.dart';
import './detalle_tramite_screem.dart'; // La crearemos en el Paso 3

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final ApiService _apiService = ApiService();
  List<dynamic> _tramites = [];
  bool _isLoading = true;
  String _errorMessage = '';

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Obtenemos el ID que pasamos desde el Login
    final String perfilId = ModalRoute.of(context)?.settings.arguments as String? ?? '';
    if (perfilId.isNotEmpty && _isLoading) {
      _cargarTramites(perfilId);
    }
  }

  Future<void> _cargarTramites(String id) async {
    try {
      final data = await _apiService.obtenerTramites(id);
      setState(() {
        _tramites = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  // Método para formatear la fecha rápida y bonito
  String _formatearFecha(String fechaIso) {
    try {
      final date = DateTime.parse(fechaIso);
      return "${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year} a las ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}";
    } catch (e) {
      return fechaIso;
    }
  }

  // Importa esto arriba si usas SharedPreferences
  // import 'package:shared_preferences/shared_preferences.dart';

  void _cerrarSesion(BuildContext context) async {
    // 1. Opcional: Borrar datos guardados en el celular (si usaste SharedPreferences en el Login)
    // final prefs = await SharedPreferences.getInstance();
    // await prefs.clear();

    // 2. Volver al Login destruyendo todo el historial de navegación por seguridad
    if (context.mounted) {
      Navigator.pushNamedAndRemoveUntil(
        context, 
        '/login', // Cambia esto por la ruta de tu pantalla de login
        (Route<dynamic> route) => false, // Este "false" destruye todas las pantallas anteriores
      );

      /* NOTA: Si no usas rutas nombradas ('/login'), usa esto en su lugar:
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (context) => const LoginScreen()), // Tu clase de Login
        (route) => false,
      );
      */
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF141414),
      appBar: AppBar(
        title: const Text('Mis Trámites', style: TextStyle(color: Colors.white)),
        backgroundColor: const Color(0xFF1A1A1A),
        iconTheme: const IconThemeData(color: Colors.tealAccent),

        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.redAccent),
            tooltip: 'Cerrar Sesión',
            onPressed: () {
              // Pequeño diálogo de confirmación para evitar toques accidentales
              showDialog(
                context: context,
                builder: (context) => AlertDialog(
                  backgroundColor: const Color(0xFF1E1E1E),
                  title: const Text('Cerrar Sesión', style: TextStyle(color: Colors.white)),
                  content: const Text('¿Estás seguro de que deseas salir?', style: TextStyle(color: Colors.white70)),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(context), // Cierra el diálogo
                      child: const Text('Cancelar', style: TextStyle(color: Colors.white54)),
                    ),
                    TextButton(
                      onPressed: () {
                        Navigator.pop(context); // Cierra el diálogo
                        _cerrarSesion(context); // Llama a tu método
                      },
                      child: const Text('Salir', style: TextStyle(color: Colors.redAccent)),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Colors.tealAccent))
          : _errorMessage.isNotEmpty
              ? Center(child: Text('Error: $_errorMessage', style: const TextStyle(color: Colors.redAccent)))
              : _tramites.isEmpty
                  ? const Center(child: Text('No tienes trámites en curso.', style: TextStyle(color: Colors.white54)))
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _tramites.length,
                      itemBuilder: (context, index) {
                        final tramite = _tramites[index];
                        
                        return Card(
                          color: const Color(0xFF1E1E1E),
                          margin: const EdgeInsets.only(bottom: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                            side: const BorderSide(color: Colors.white12, width: 1),
                          ),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(12),
                            onTap: () {
                              // 🚀 Navegamos a la vista de detalle y le pasamos todo el JSON de este trámite
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => DetalleTramiteScreen(tramiteData: tramite),
                                ),
                              );
                            },
                            child: Padding(
                              padding: const EdgeInsets.all(16.0),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Expanded(
                                        child: Text(
                                          tramite['workflowName'] ?? 'Sin Nombre',
                                          style: const TextStyle(
                                            fontSize: 18,
                                            fontWeight: FontWeight.bold,
                                            color: Colors.tealAccent,
                                          ),
                                        ),
                                      ),
                                      // Chip de Estado
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: Colors.teal.withOpacity(0.2),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          tramite['status'] ?? 'PENDIENTE',
                                          style: const TextStyle(fontSize: 12, color: Colors.tealAccent),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    tramite['workflowDescription'] ?? 'Sin descripción',
                                    style: const TextStyle(color: Colors.white70, fontSize: 14),
                                  ),
                                  const SizedBox(height: 16),
                                  Row(
                                    children: [
                                      const Icon(Icons.access_time, size: 16, color: Colors.white54),
                                      const SizedBox(width: 8),
                                      Text(
                                        'Última act: ${_formatearFecha(tramite['updatedAt'])}',
                                        style: const TextStyle(color: Colors.white54, fontSize: 12),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
    );
  }
}