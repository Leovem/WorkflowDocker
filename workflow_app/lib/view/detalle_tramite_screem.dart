import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class DetalleTramiteScreen extends StatelessWidget {
  final Map<String, dynamic> tramiteData;

  const DetalleTramiteScreen({super.key, required this.tramiteData});

  // 🚀 Función para abrir enlaces (PDFs, Imágenes) en el navegador del celular
  Future<void> _abrirUrl(BuildContext context, String? urlString) async {
    if (urlString == null || urlString.isEmpty) return;
    
    final Uri url = Uri.parse(urlString);
    try {
      if (!await launchUrl(url, mode: LaunchMode.externalApplication)) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('No se pudo abrir el documento')),
          );
        }
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Error al intentar abrir el enlace')),
        );
      }
    }
  }

  String _formatearHora(String fechaIso) {
    try {
      final date = DateTime.parse(fechaIso);
      return "${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}";
    } catch (e) {
      return "";
    }
  }

  // 🚀 Widget reutilizable para mostrar botones de documentos adjuntos
  Widget _construirFilaArchivos(BuildContext context, Map<String, dynamic>? media) {
    if (media == null) return const SizedBox.shrink();

    List<Widget> botones = [];

    if (media['document'] != null) {
      botones.add(_botonArchivo(context, 'Documento', Icons.picture_as_pdf, Colors.redAccent, media['document']));
    }
    if (media['photo'] != null) {
      botones.add(_botonArchivo(context, 'Imagen', Icons.image, Colors.blueAccent, media['photo']));
    }
    if (media['video'] != null) {
      botones.add(_botonArchivo(context, 'Video', Icons.video_file, Colors.purpleAccent, media['video']));
    }
    if (media['audio'] != null) {
      botones.add(_botonArchivo(context, 'Audio', Icons.audiotrack, Colors.orangeAccent, media['audio']));
    }

    if (botones.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(top: 8.0),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: botones,
      ),
    );
  }

  Widget _botonArchivo(BuildContext context, String texto, IconData icono, Color color, String url) {
    return ActionChip(
      avatar: Icon(icono, size: 16, color: color),
      label: Text(texto, style: const TextStyle(fontSize: 12, color: Colors.white)),
      backgroundColor: const Color(0xFF2A2A2A),
      side: BorderSide(color: color.withOpacity(0.5)),
      onPressed: () => _abrirUrl(context, url),
    );
  }

  @override
  Widget build(BuildContext context) {
    final List<dynamic> historial = tramiteData['history'] ?? [];
    
    // Extraemos los requisitos globales (Datos que el usuario llenó al iniciar)
    final globalReq = tramiteData['workflow']?['globalRequirements'];
    final customFields = globalReq?['customFields'] as Map<String, dynamic>? ?? {};
    final globalMedia = globalReq?['media'] as Map<String, dynamic>?;

    return Scaffold(
      backgroundColor: const Color(0xFF141414),
      appBar: AppBar(
        title: const Text('Seguimiento', style: TextStyle(color: Colors.white)),
        backgroundColor: const Color(0xFF1A1A1A),
        iconTheme: const IconThemeData(color: Colors.tealAccent),
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ==========================================
            // CABECERA
            // ==========================================
            Container(
              color: const Color(0xFF1E1E1E),
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          tramiteData['workflowName'] ?? 'Sin Nombre',
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.teal.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.tealAccent.withOpacity(0.5)),
                        ),
                        child: Text(
                          tramiteData['status'] ?? '',
                          style: const TextStyle(fontSize: 12, color: Colors.tealAccent, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    tramiteData['workflowDescription'] ?? '',
                    style: const TextStyle(fontSize: 14, color: Colors.white70),
                  ),
                  const SizedBox(height: 16),
                  
                  // 🚀 DATOS INICIALES DEL TRÁMITE (Custom Fields y Documentos iniciales)
                  if (customFields.isNotEmpty || (globalMedia != null && globalMedia.values.any((v) => v != null)))
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF141414),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.white12),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Datos Iniciales de la Solicitud', style: TextStyle(color: Colors.tealAccent, fontSize: 14, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 8),
                          ...customFields.entries.map((e) => Padding(
                            padding: const EdgeInsets.only(bottom: 4.0),
                            child: Text('• ${e.value}', style: const TextStyle(color: Colors.white70, fontSize: 13)),
                          )),
                          _construirFilaArchivos(context, globalMedia),
                        ],
                      ),
                    ),
                ],
              ),
            ),
            
            const Padding(
              padding: EdgeInsets.all(20.0),
              child: Text(
                'Línea de Tiempo',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.tealAccent),
              ),
            ),

            // ==========================================
            // LÍNEA DE TIEMPO (Historial)
            // ==========================================
            ListView.builder(
              physics: const NeverScrollableScrollPhysics(), // Desactiva el scroll interno
              shrinkWrap: true, // Permite que ListView viva dentro del SingleChildScrollView
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              itemCount: historial.length,
              itemBuilder: (context, index) {
                final item = historial[index];
                final nodeName = item['nodeName'] ?? 'Revisión / Acción';
                final type = item['type'] ?? item['action'];
                final isLast = index == historial.length - 1;

                // 🚀 Extraemos las decisiones y documentos de este paso específico
                final submittedData = item['submittedData']?['nodo'] as Map<String, dynamic>?;
                final mediaNodo = submittedData?['media'] as Map<String, dynamic>?;
                final observaciones = submittedData?['observaciones_tecnica'];
                final decision = submittedData?['decision_tecnica'];

                return IntrinsicHeight(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // COLUMNA IZQUIERDA: Puntos y líneas
                      Column(
                        children: [
                          Container(
                            width: 16,
                            height: 16,
                            decoration: BoxDecoration(
                              color: isLast ? Colors.tealAccent : Colors.teal.withOpacity(0.3),
                              shape: BoxShape.circle,
                              border: Border.all(color: const Color(0xFF141414), width: 2),
                            ),
                          ),
                          if (!isLast)
                            Expanded(child: Container(width: 2, color: Colors.teal.withOpacity(0.2))),
                        ],
                      ),
                      const SizedBox(width: 16),
                      
                      // COLUMNA DERECHA: Contenido
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(bottom: 24.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Text(
                                      nodeName.toString().toUpperCase(),
                                      style: TextStyle(
                                        fontSize: 15,
                                        fontWeight: isLast ? FontWeight.bold : FontWeight.normal,
                                        color: isLast ? Colors.white : Colors.white70,
                                      ),
                                    ),
                                  ),
                                  Text(
                                    _formatearHora(item['timestamp'] ?? ''),
                                    style: const TextStyle(fontSize: 12, color: Colors.white54),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text('Acción: $type', style: const TextStyle(fontSize: 12, color: Colors.white38)),
                              
                              // 🚀 OBSERVACIONES O DECISIONES (Si existen)
                              if (observaciones != null || decision != null)
                                Container(
                                  margin: const EdgeInsets.only(top: 8),
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.05),
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border(left: BorderSide(color: decision == 'Aprobar' ? Colors.green : Colors.orange, width: 3)),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      if (decision != null)
                                        Text('Decisión: $decision', style: TextStyle(fontSize: 12, color: decision == 'Aprobar' ? Colors.greenAccent : Colors.orangeAccent, fontWeight: FontWeight.bold)),
                                      if (observaciones != null)
                                        Text('Obs: $observaciones', style: const TextStyle(fontSize: 12, color: Colors.white70, fontStyle: FontStyle.italic)),
                                    ],
                                  ),
                                ),

                              // 🚀 LOS BOTONES DE LOS DOCUMENTOS
                              _construirFilaArchivos(context, mediaNodo),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}