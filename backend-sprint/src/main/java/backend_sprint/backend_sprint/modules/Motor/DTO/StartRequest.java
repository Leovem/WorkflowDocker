package backend_sprint.backend_sprint.modules.Motor.DTO;

import java.util.Map;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

// Si usas Spring Boot 2.x o inferior, cambia "jakarta" por "javax":
// import javax.validation.constraints.Email;
// import javax.validation.constraints.NotBlank;

public class StartRequest {
    
    // El mensaje dentro de (message = "...") es lo que se enviará al cliente si la validación falla
    @NotBlank(message = "El ID de la política (policyId) es obligatorio.")
    private String policyId;

    @NotBlank(message = "El nombre del solicitante es obligatorio.")
    private String name;

    @Email(message = "El formato del correo electrónico no es válido.")
    @NotBlank(message = "El correo electrónico es obligatorio.")
    private String email;

    @NotBlank(message = "El documento de identidad es obligatorio.")
    private String documentId;

    private Map<String, Object> workflow; 

    // 🚀 1. CONSTRUCTOR VACÍO (Obligatorio para que Jackson funcione)
    public StartRequest() {
    }

    // 🚀 2. GETTERS Y SETTERS MANUALES (Sin Lombok)
    public String getPolicyId() {
        return policyId;
    }

    public void setPolicyId(String policyId) {
        this.policyId = policyId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getDocumentId() {
        return documentId;
    }

    public void setDocumentId(String documentId) {
        this.documentId = documentId;
    }

    public Map<String, Object> getWorkflow() {
        return workflow;
    }

    public void setWorkflow(Map<String, Object> workflow) {
        this.workflow = workflow;
    }
}