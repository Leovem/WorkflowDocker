package backend_sprint.backend_sprint.modules.Inteligencia_y_Comunicacion.service;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import org.springframework.stereotype.Service;

@Service
public class FcmNotificationService {

    public void sendPushNotification(String targetFcmToken, String title, String body) {
        if (targetFcmToken == null || targetFcmToken.trim().isEmpty()) {
            System.out.println("⚠️ No se puede enviar Push: El perfil no tiene fcmToken registrado.");
            return;
        }

        try {
            // Construimos la notificación visual
            Notification notification = Notification.builder()
                    .setTitle(title)
                    .setBody(body)
                    .build();

            // Construimos el mensaje dirigido a ese token específico
            Message message = Message.builder()
                    .setToken(targetFcmToken)
                    .setNotification(notification)
                    .putData("click_action", "FLUTTER_NOTIFICATION_CLICK") // Útil si tu app móvil es en Flutter
                    .build();

            // Enviamos a Firebase
            String response = FirebaseMessaging.getInstance().send(message);
            System.out.println("✅ Notificación Push enviada con éxito: " + response);

        } catch (Exception e) {
            System.err.println("❌ Error al enviar Notificación Push: " + e.getMessage());
        }
    }


    public void sendSilentRefreshSignal(String targetFcmToken) {
        if (targetFcmToken == null || targetFcmToken.trim().isEmpty()) return;

        try {
            // 🚀 Construimos un mensaje ÚNICAMENTE con datos (Sin Notification)
            Message message = Message.builder()
                    .setToken(targetFcmToken)
                    .putData("action", "REFRESH_TRAMITES") // Nuestra palabra clave secreta
                    .putData("timestamp", String.valueOf(System.currentTimeMillis()))
                    .build();

            FirebaseMessaging.getInstance().send(message);
            System.out.println("🤫 Señal de refresco silencioso enviada.");

        } catch (Exception e) {
            System.err.println("❌ Error al enviar señal silenciosa: " + e.getMessage());
        }
    }
}