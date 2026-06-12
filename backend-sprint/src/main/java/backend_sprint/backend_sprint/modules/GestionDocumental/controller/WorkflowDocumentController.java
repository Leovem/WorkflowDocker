package backend_sprint.backend_sprint.modules.GestionDocumental.controller;

import java.io.IOException;
import java.util.List;

import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import backend_sprint.backend_sprint.modules.GestionDocumental.dto.DocumentAuditLogResponse;
import backend_sprint.backend_sprint.modules.GestionDocumental.dto.UpdateDocumentStatusRequest;
import backend_sprint.backend_sprint.modules.GestionDocumental.dto.WorkflowDocumentResponse;
import backend_sprint.backend_sprint.modules.GestionDocumental.dto.WorkflowDocumentUploadRequest;
import backend_sprint.backend_sprint.modules.GestionDocumental.model.WorkflowDocument;
import backend_sprint.backend_sprint.modules.GestionDocumental.service.DocumentAuditLogService;
import backend_sprint.backend_sprint.modules.GestionDocumental.service.WorkflowDocumentService;

@RestController
@RequestMapping("/api/documents")
public class WorkflowDocumentController {

        private final WorkflowDocumentService documentService;
        private final DocumentAuditLogService auditLogService;

        public WorkflowDocumentController(
                        WorkflowDocumentService documentService,
                        DocumentAuditLogService auditLogService) {
                this.documentService = documentService;
                this.auditLogService = auditLogService;
        }

        @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
public ResponseEntity<WorkflowDocumentResponse> uploadDocument(
                @RequestPart("file") MultipartFile file,
                @RequestParam("policyId") String policyId,
                @RequestParam("processInstanceId") String processInstanceId,
                @RequestParam("clientId") String clientId,
                @RequestParam(value = "nodeId", required = false) String nodeId,
                @RequestParam(value = "departmentId", required = false) String departmentId,
                @RequestParam(value = "requiredDocumentId", required = false) String requiredDocumentId,
                @RequestParam(value = "requiredDocumentName", required = false) String requiredDocumentName,
                @RequestParam("uploadedByUserId") String uploadedByUserId,
                @RequestParam("uploadedByUserName") String uploadedByUserName) throws IOException {

        WorkflowDocumentUploadRequest request = new WorkflowDocumentUploadRequest();

        request.setPolicyId(policyId);
        request.setProcessInstanceId(processInstanceId);
        request.setClientId(clientId);
        request.setNodeId(nodeId);

        request.setDepartmentId(departmentId);
        request.setRequiredDocumentId(requiredDocumentId);
        request.setRequiredDocumentName(requiredDocumentName);

        request.setUploadedByUserId(uploadedByUserId);
        request.setUploadedByUserName(uploadedByUserName);

        WorkflowDocument savedDocument = documentService.uploadDocument(file, request);

        return ResponseEntity.ok(WorkflowDocumentResponse.fromEntity(savedDocument));
}

        @GetMapping
        public ResponseEntity<List<WorkflowDocumentResponse>> getAllDocuments() {
                List<WorkflowDocumentResponse> documents = documentService.findAll()
                                .stream()
                                .map(WorkflowDocumentResponse::fromEntity)
                                .toList();

                return ResponseEntity.ok(documents);
        }

        @GetMapping("/{id}")
        public ResponseEntity<WorkflowDocumentResponse> getDocumentById(@PathVariable String id) {
                WorkflowDocument document = documentService.findById(id);

                return ResponseEntity.ok(WorkflowDocumentResponse.fromEntity(document));
        }

        @GetMapping("/process-instance/{processInstanceId}")
        public ResponseEntity<List<WorkflowDocumentResponse>> getDocumentsByProcessInstance(
                        @PathVariable String processInstanceId) {
                List<WorkflowDocumentResponse> documents = documentService.findByProcessInstanceId(processInstanceId)
                                .stream()
                                .map(WorkflowDocumentResponse::fromEntity)
                                .toList();

                return ResponseEntity.ok(documents);
        }

        @GetMapping("/client/{clientId}")
        public ResponseEntity<List<WorkflowDocumentResponse>> getDocumentsByClient(
                        @PathVariable String clientId) {
                List<WorkflowDocumentResponse> documents = documentService.findByClientId(clientId)
                                .stream()
                                .map(WorkflowDocumentResponse::fromEntity)
                                .toList();

                return ResponseEntity.ok(documents);
        }

        @GetMapping("/policy/{policyId}")
        public ResponseEntity<List<WorkflowDocumentResponse>> getDocumentsByPolicy(
                        @PathVariable String policyId) {
                List<WorkflowDocumentResponse> documents = documentService.findByPolicyId(policyId)
                                .stream()
                                .map(WorkflowDocumentResponse::fromEntity)
                                .toList();

                return ResponseEntity.ok(documents);
        }

        @GetMapping("/process-instance/{processInstanceId}/node/{nodeId}")
        public ResponseEntity<List<WorkflowDocumentResponse>> getDocumentsByProcessInstanceAndNode(
                        @PathVariable String processInstanceId,
                        @PathVariable String nodeId) {
                List<WorkflowDocumentResponse> documents = documentService
                                .findByProcessInstanceIdAndNodeId(processInstanceId, nodeId)
                                .stream()
                                .map(WorkflowDocumentResponse::fromEntity)
                                .toList();

                return ResponseEntity.ok(documents);
        }

        @GetMapping("/download/{storedFileName}")
        public ResponseEntity<Resource> downloadDocument(
                        @PathVariable String storedFileName,
                        @RequestParam(value = "userId", required = false) String userId,
                        @RequestParam(value = "userName", required = false) String userName) {
                Resource resource = documentService.loadFileAsResourceAndRegisterDownload(
                                storedFileName,
                                userId,
                                userName);

                return ResponseEntity.ok()
                                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                                .header(
                                                HttpHeaders.CONTENT_DISPOSITION,
                                                "attachment; filename=\"" + resource.getFilename() + "\"")
                                .body(resource);
        }

        @PatchMapping("/{id}/status")
        public ResponseEntity<WorkflowDocumentResponse> updateDocumentStatus(
                        @PathVariable String id,
                        @RequestBody UpdateDocumentStatusRequest request) {
                WorkflowDocument updatedDocument = documentService.updateDocumentStatus(
                                id,
                                request.getStatus(),
                                request.getObservation(),
                                request.getReviewedByUserId(),
                                request.getReviewedByUserName());

                return ResponseEntity.ok(WorkflowDocumentResponse.fromEntity(updatedDocument));
        }

        @PostMapping("/{id}/view")
        public ResponseEntity<WorkflowDocumentResponse> registerDocumentView(
                        @PathVariable String id,
                        @RequestParam(value = "userId", required = false) String userId,
                        @RequestParam(value = "userName", required = false) String userName) {
                WorkflowDocument document = documentService.registerView(id, userId, userName);

                return ResponseEntity.ok(WorkflowDocumentResponse.fromEntity(document));
        }

        @GetMapping("/{id}/audit")
        public ResponseEntity<List<DocumentAuditLogResponse>> getDocumentAuditLogs(
                        @PathVariable String id) {
                List<DocumentAuditLogResponse> logs = auditLogService.findByDocumentId(id)
                                .stream()
                                .map(DocumentAuditLogResponse::fromEntity)
                                .toList();

                return ResponseEntity.ok(logs);
        }

        @GetMapping("/process-instance/{processInstanceId}/audit")
        public ResponseEntity<List<DocumentAuditLogResponse>> getProcessInstanceAuditLogs(
                        @PathVariable String processInstanceId) {
                List<DocumentAuditLogResponse> logs = auditLogService.findByProcessInstanceId(processInstanceId)
                                .stream()
                                .map(DocumentAuditLogResponse::fromEntity)
                                .toList();

                return ResponseEntity.ok(logs);
        }
}