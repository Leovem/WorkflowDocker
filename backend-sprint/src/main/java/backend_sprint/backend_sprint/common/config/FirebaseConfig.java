package backend_sprint.backend_sprint.common.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import jakarta.annotation.PostConstruct; // Si usas Spring Boot 3+ (Java 17+)
// import javax.annotation.PostConstruct; // Usa esta línea si estás en Spring Boot 2.x

import java.io.InputStream;

@Configuration
public class FirebaseConfig {

    @PostConstruct
    public void initialize() {
        try {
            // Verifica que Firebase no se haya inicializado antes para evitar errores
            if (FirebaseApp.getApps().isEmpty()) {
                
                // Lee el archivo JSON desde src/main/resources
                InputStream serviceAccount = new ClassPathResource("workflow-app-firebase-key.json").getInputStream();

                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                        .build();

                FirebaseApp.initializeApp(options);
                System.out.println("🔥 [FIREBASE] Inicializado correctamente. Listo para enviar Push Notifications.");
            }
        } catch (Exception e) {
            System.err.println("❌ [FIREBASE] Error crítico al inicializar Firebase: " + e.getMessage());
            e.printStackTrace();
        }
    }
}