package backend_sprint.backend_sprint.common.config;

import java.io.IOException;
import java.io.InputStream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import com.google.auth.oauth2.GoogleCredentials; 
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;

import jakarta.annotation.PostConstruct;

@Configuration
public class FirebaseConfig {

    // 1. Añadimos un Logger profesional en lugar de usar System.out / System.err
    private static final Logger log = LoggerFactory.getLogger(FirebaseConfig.class);

    @PostConstruct
    public void initialize() {
        try {
            // Verifica que Firebase no se haya inicializado antes
            if (FirebaseApp.getApps().isEmpty()) {
                
                // Lee el archivo JSON desde src/main/resources
                InputStream serviceAccount = new ClassPathResource("workflow-app-firebase-key.json").getInputStream();

                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                        .build();

                FirebaseApp.initializeApp(options);
                log.info("🔥 [FIREBASE] Inicializado correctamente. Listo para enviar Push Notifications.");
            }
        } catch (IOException e) { 
            log.error("❌ [FIREBASE] Error crítico al inicializar Firebase: {}", e.getMessage(), e);
        }
    }
}