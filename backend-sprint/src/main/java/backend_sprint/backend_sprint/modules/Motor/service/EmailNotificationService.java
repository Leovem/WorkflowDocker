package backend_sprint.backend_sprint.modules.Motor.service;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.stereotype.Service;

@EnableAsync
@Service
public class EmailNotificationService {

    private final JavaMailSender mailSender;

    public EmailNotificationService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Async
    public void sendAccessEmail(String toEmail, String fullName, String token) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(toEmail);
            helper.setSubject("Acceso a su Trámite");

            // URL del frontend donde el usuario pegará su token (Ajusta el dominio)
            String loginUrl = "https://drive.google.com/file/d/1nQkLWO9eeLHxXdXGqJjhb3LrEMXB035r/view?usp=sharing";

            // Plantilla HTML profesional
            String htmlContent = "<div style='font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;'>"
                    + "<h2 style='color: #10b981;'>Hola, " + fullName + "</h2>"
                    + "<p>Hemos recibido su solicitud y su trámite ha sido iniciado correctamente.</p>"
                    + "<p>Para hacer seguimiento a su proceso o subir documentos adicionales, utilice su clave de acceso única:</p>"
                    + "<div style='background-color: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;'>"
                    + "   <strong style='font-size: 20px; color: #1f2937; letter-spacing: 2px;'>" + token + "</strong>"
                    + "</div>"
                    + "<p>O haga clic directamente en el siguiente botón:</p>"
                    + "<a href='" + loginUrl + "' style='display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;'>Acceder a mi Trámite</a>"
                    + "<p style='margin-top: 30px; font-size: 12px; color: #6b7280;'>"
                    + "Este token expirará 5 días después de que su trámite haya finalizado. Por favor, no comparta este código con nadie."
                    + "</p>"
                    + "</div>";

            helper.setText(htmlContent, true); // true indica que es HTML

            mailSender.send(message);
            System.out.println("✅ Correo enviado exitosamente a: " + toEmail);

        } catch (MessagingException e) {
            System.err.println("❌ Error al enviar correo a " + toEmail + ": " + e.getMessage());
        }
    }
}