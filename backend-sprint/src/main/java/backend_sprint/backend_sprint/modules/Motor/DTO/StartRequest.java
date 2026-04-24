package backend_sprint.backend_sprint.modules.Motor.DTO;

import java.util.Map;

public class StartRequest {
    
    private String policyId;
    private String name;
    private String email;
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