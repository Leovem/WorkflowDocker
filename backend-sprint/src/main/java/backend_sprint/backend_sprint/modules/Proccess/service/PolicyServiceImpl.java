package backend_sprint.backend_sprint.modules.Proccess.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import backend_sprint.backend_sprint.modules.Motor.repository.InstanceRepository;
import backend_sprint.backend_sprint.modules.Proccess.model.policy;
import backend_sprint.backend_sprint.modules.Proccess.repository.PolicyRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PolicyServiceImpl implements PolicyService {

    private static final Logger log = LoggerFactory.getLogger(PolicyServiceImpl.class);
    private static final String COLLECTION = "policy";

    private final MongoTemplate mongoTemplate;
    private final PolicyRepository policyRepository;
    private final InstanceRepository instanceRepo;

    @Override
    public List<Map<String, Object>> findAll() {
        Query query = new Query();
        query.fields().include("_id", "name", "description");

        List<Document> docs = mongoTemplate.find(query, Document.class, COLLECTION);

        List<Map<String, Object>> results = new ArrayList<>();
        for (Document doc : docs) {
            if (doc.containsKey("_id")) {
                doc.put("id", doc.get("_id").toString());
                doc.remove("_id");
            }
            results.add(doc);
        }
        return results;
    }

    @Override
    @SuppressWarnings("unchecked")
    public Map<String, Object> findById(String id) {
        Document policyDoc = null;

        // 1. CORREGIDO: Intentar buscar por el ID tal como viene (String)
        try {
            policyDoc = mongoTemplate.findById(id, Document.class, COLLECTION);
        } catch (Exception ex) {
            log.warn("⚠️ No se pudo buscar la política con id String estándar: {}. Reintentando con ObjectId.", id);
        }

        // 2. CORREGIDO: Si no se encuentra, intentar parsear a ObjectId de forma segura
        if (policyDoc == null) {
            try {
                if (ObjectId.isValid(id)) { // Validación previa para evitar excepciones innecesarias
                    policyDoc = mongoTemplate.findById(new ObjectId(id), Document.class, COLLECTION);
                }
            } catch (IllegalArgumentException e) {
                log.error("❌ El formato del ID provisto no es un ObjectId válido para MongoDB: {}", id);
            }
        }

        if (policyDoc == null) {
            throw new IllegalArgumentException("La política con id " + id + " no existe.");
        }

        policyDoc.put("id", policyDoc.get("_id").toString());
        
        log.info("ℹ️ Enviando datos de la política ID: {} al controlador.", id);
        return (Map<String, Object>) (Map<?, ?>) policyDoc;
    }

    @Override
    public Map<String, Object> create(Map<String, Object> request) {
        if (request.containsKey("name")) {
            String name = (String) request.get("name");
            Query query = new Query(Criteria.where("name").is(name));
            if (mongoTemplate.exists(query, COLLECTION)) {
                throw new IllegalStateException("Ya existe una política con el nombre: " + name);
            }
        }

        request.put("status", false); // Forzar modo borrador de entrada

        if (request.containsKey("id")) {
            request.remove("id");
        }

        Document saved = mongoTemplate.save(new Document(request), COLLECTION);
        saved.put("id", saved.get("_id").toString());
        return saved;
    }

    @Override
    public Map<String, Object> update(String id, Map<String, Object> request) {
        Map<String, Object> existing = findById(id);

        // =====================================================================
        // 🛡️ VALIDACIONES DE ARQUITECTURA (BLOQUEO DE EDICIÓN Y DESPUBLICACIÓN)
        // =====================================================================
        Boolean statusInDb = (Boolean) existing.get("status");

        if (Boolean.TRUE.equals(statusInDb)) {
            Boolean newStatus = (Boolean) request.get("status");

            if (Boolean.FALSE.equals(newStatus)) {
                if (instanceRepo.existsByPolicyId(id)) {
                    throw new IllegalStateException("No se puede despublicar esta política porque ya está siendo utilizada en trámites activos.");
                }
            } else {
                throw new IllegalStateException("La política está publicada y no permite modificaciones. Despublíquela primero para poder editarla.");
            }
        }
        // =====================================================================

        if (request.containsKey("name") && existing.containsKey("name")
                && !request.get("name").equals(existing.get("name"))) {
            Query query = new Query(Criteria.where("name").is(request.get("name")));
            if (mongoTemplate.exists(query, COLLECTION)) {
                throw new IllegalStateException("Ya existe una política con el nombre: " + request.get("name"));
            }
        }

        request.remove("id");
        Document doc = new Document(request);

        // CORREGIDO: Validación segura antes de mutar el ID
        if (ObjectId.isValid(id)) {
            doc.put("_id", new ObjectId(id));
        } else {
            doc.put("_id", id);
        }

        Document saved = mongoTemplate.save(doc, COLLECTION);
        saved.put("id", saved.get("_id").toString());
        return saved;
    }

    @Override
    public void delete(String id) {
        Map<String, Object> existing = findById(id);
        
        Boolean isPublished = (Boolean) existing.get("status");
        if (Boolean.TRUE.equals(isPublished)) {
            throw new IllegalArgumentException("No se puede eliminar una política que está publicada. Primero cámbiela a modo borrador.");
        }

        if (instanceRepo.existsByPolicyId(id)) {
            throw new IllegalArgumentException("No se puede eliminar la política porque ya existen trámites registrados con ella.");
        }

        Document doc = new Document(existing);
        
        // Reconstruimos el _id real de Mongo antes de eliminar
        if (doc.containsKey("id")) {
            String cleanId = (String) doc.get("id");
            if (ObjectId.isValid(cleanId)) {
                doc.put("_id", new ObjectId(cleanId));
            } else {
                doc.put("_id", cleanId);
            }
            doc.remove("id");
        }
        
        mongoTemplate.remove(doc, COLLECTION);
        log.info("🗑️ Política eliminada con éxito de la base de datos. ID: {}", id);
    }

    @Override
    @SuppressWarnings("unchecked")
    public Map<String, Object> getPolicyJsonById(String id) {
        policy p = policyRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Política no encontrada con ID: " + id));

        Object workflow = p.getWorkflow();

        if (workflow == null) {
            throw new IllegalStateException("La política no tiene un flujo (workflow) configurado.");
        }

        if (workflow instanceof Map) {
            return (Map<String, Object>) workflow;
        } 
        
        throw new IllegalStateException("El formato del workflow guardado no es un JSON válido.");
    }

    @Override
    public List<Map<String, Object>> findActivePolicies() {
        Query query = new Query(Criteria.where("status").is(true));
        List<Document> documents = mongoTemplate.find(query, Document.class, COLLECTION);
        
        return documents.stream()
                .map(doc -> {
                    Map<String, Object> map = new HashMap<>(doc);
                    if (map.containsKey("_id")) {
                        map.put("id", map.get("_id").toString());
                        map.remove("_id");
                    }
                    return map;
                })
                .collect(Collectors.toList());
    }
}