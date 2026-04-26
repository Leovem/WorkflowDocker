package backend_sprint.backend_sprint.modules.Proccess.service;

import java.util.List;
import java.util.Map;

public interface PolicyService {
    List<java.util.Map<String, Object>> findAll();

    java.util.Map<String, Object> findById(String id);

    java.util.Map<String, Object> create(java.util.Map<String, Object> request);

    java.util.Map<String, Object> update(String id, java.util.Map<String, Object> request);

    void delete(String id);

    Map<String, Object> getPolicyJsonById(String id);

    List<Map<String, Object>> findActivePolicies();

}
