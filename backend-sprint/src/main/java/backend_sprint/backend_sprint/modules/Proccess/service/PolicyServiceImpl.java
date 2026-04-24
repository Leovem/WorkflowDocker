package backend_sprint.backend_sprint.modules.Proccess.service;


import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.google.api.services.storage.model.Policy;

import backend_sprint.backend_sprint.modules.Proccess.model.policy;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PolicyServiceImpl implements PolicyService {

    private final org.springframework.data.mongodb.core.MongoTemplate mongoTemplate;
    private static final String COLLECTION = "policy";
    private final backend_sprint.backend_sprint.modules.Proccess.repository.PolicyRepository policyRepository;

    @Override
    public java.util.List<java.util.Map<String, Object>> findAll() {
        org.springframework.data.mongodb.core.query.Query query = new org.springframework.data.mongodb.core.query.Query();
        query.fields().include("_id", "name", "description");

        java.util.List<?> docs = mongoTemplate.find(query, org.bson.Document.class, COLLECTION);

        java.util.List<java.util.Map<String, Object>> results = new java.util.ArrayList<>();
        for (Object obj : docs) {
            org.bson.Document doc = (org.bson.Document) obj;
            if (doc.containsKey("_id")) {
                doc.put("id", doc.get("_id").toString());
                doc.remove("_id"); // Optionally remove _id if frontend only uses 'id'
            }
            results.add(doc);
        }
        return results;
    }

    @Override
    @SuppressWarnings("unchecked")
    public java.util.Map<String, Object> findById(String id) {
        org.bson.Document policy = null;
        try {
            policy = mongoTemplate.findById(id, org.bson.Document.class, COLLECTION);
        } catch (Exception ex) {
            // It might fail if id is an ObjectId string and we just send passing string
            // without mapping it.
            // Spring data usually tries to convert String id to ObjectId.
        }

        if (policy == null) {
            // let's try manual object id just in case
            try {
                policy = mongoTemplate.findById(new org.bson.types.ObjectId(id), org.bson.Document.class, COLLECTION);
            } catch (Exception e) {
            }
        }

        if (policy == null) {
            throw new IllegalArgumentException("La política con id " + id + " no existe.");
        }

        policy.put("id", policy.get("_id").toString());
        
        System.out.println("--- ENVIANDO AL FRONTEND (GET POR ID) ---");
        System.out.println(policy.toJson());
        System.out.println("-----------------------------------------");
        
        return (java.util.Map<String, Object>) (java.util.Map<?, ?>) policy;
    }

    @Override
    public java.util.Map<String, Object> create(java.util.Map<String, Object> request) {
        if (request.containsKey("name")) {
            String name = (String) request.get("name");
            org.springframework.data.mongodb.core.query.Query query = new org.springframework.data.mongodb.core.query.Query(
                    org.springframework.data.mongodb.core.query.Criteria.where("name").is(name));
            if (mongoTemplate.exists(query, COLLECTION)) {
                throw new IllegalStateException("Ya existe una política con el nombre: " + name);
            }
        }

        if (request.containsKey("id"))
            request.remove("id");

        org.bson.Document saved = mongoTemplate.save(new org.bson.Document(request), COLLECTION);
        saved.put("id", saved.get("_id").toString());
        return saved;
    }

    @Override
    public java.util.Map<String, Object> update(String id, java.util.Map<String, Object> request) {
        java.util.Map<String, Object> existing = findById(id);

        if (request.containsKey("name") && existing.containsKey("name")
                && !request.get("name").equals(existing.get("name"))) {
            org.springframework.data.mongodb.core.query.Query query = new org.springframework.data.mongodb.core.query.Query(
                    org.springframework.data.mongodb.core.query.Criteria.where("name").is(request.get("name")));
            if (mongoTemplate.exists(query, COLLECTION)) {
                throw new IllegalStateException("Ya existe una política con el nombre: " + request.get("name"));
            }
        }

        request.remove("id");
        org.bson.Document doc = new org.bson.Document(request);

        try {
            doc.put("_id", new org.bson.types.ObjectId(id));
        } catch (Exception e) {
            doc.put("_id", id);
        }

        org.bson.Document saved = mongoTemplate.save(doc, COLLECTION);
        saved.put("id", saved.get("_id").toString());
        return saved;
    }

    @Override
    public void delete(String id) {
        java.util.Map<String, Object> existing = findById(id);
        org.bson.Document doc = new org.bson.Document(existing);
        mongoTemplate.remove(doc, COLLECTION);
    }


    @SuppressWarnings("unchecked")
    public Map<String, Object> getPolicyJsonById(String id) {
        // 1. Buscamos la política en la base de datos
        policy policy = policyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Política no encontrada con ID: " + id));

        // 2. Extraemos el campo workflow
        Object workflow = policy.getWorkflow();

        if (workflow == null) {
            throw new RuntimeException("La política no tiene un flujo (workflow) configurado.");
        }

        // 3. Verificamos el tipo de dato y lo devolvemos como Map
        if (workflow instanceof Map) {
            return (Map<String, Object>) workflow;
        } 
        
        throw new RuntimeException("El formato del workflow guardado no es un JSON válido.");
    }
    
/* 
    @Override
    public List<Map<String, Object>> getAllPoliciesJson() {
        // 1. Buscamos todas las políticas en la base de datos
        List<policy> allPolicies = policyRepository.findAll();
        
        // 2. Preparamos la lista que vamos a devolver
        List<Map<String, Object>> result = new ArrayList<>();
        
        // 3. Convertimos cada política a su formato JSON (Map)
        for (policy policy : allPolicies) {
            // Asumo que tu entidad Policy tiene algún campo o método para sacar el JSON (ej. getWorkflow)
            // Si en tu base de datos el diagrama se guarda como String, tendrás que convertirlo a Map usando ObjectMapper
            
            Map<String, Object> policyMap = new HashMap<>();
            policyMap.put("id", policy.getId());
            policyMap.put("name", policy.getName());
            
            // Reemplaza "getWorkflow" por el nombre de la variable donde guardas el JSON del diagrama en tu modelo Policy
            policyMap.put("workflow", policy.getWorkflow()); 
            
            result.add(policyMap);
        }
        
        return result;
    }
*/
}
