package backend_sprint.backend_sprint.modules.Proccess.model;

import java.util.List;
import java.util.Map;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Document(collection = "policy")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class policy {

    @Id
    private String id;

    @Indexed(unique = true)
    private String name;

    private String description;
    private Object nodes;
    private Object edges;
    private Object configuracionCanvas;
    private Object jointEngineState;
    private Object workflow;
}

@Data
@NoArgsConstructor
@AllArgsConstructor
class Node {
    private String id;
    private String type; // inicio, fin, if, join, fork, merge, actividad
    private String departamentId;
    private NodeData data;
    private Position position;
    private Dimension measured;
}

@Data
@NoArgsConstructor
@AllArgsConstructor
class NodeData {
    private String label;
    private String description;
    private List<Requirement> requirements;
    private Map<String, Object> metadata; // Configuración adicional para el tipo de nodo
}

@Data
@NoArgsConstructor
@AllArgsConstructor
class Requirement {
    private String id;
    private String type;
    private String label;
    private boolean required;
    private Map<String, Object> metadata;
}

@Data
@NoArgsConstructor
@AllArgsConstructor
class Edge {
    private String id;
    private String source;
    private String target;
    private String label;
    private String guard;
}

@Data
@NoArgsConstructor
@AllArgsConstructor
class Position {
    private double x;
    private double y;
}

@Data
@NoArgsConstructor
@AllArgsConstructor
class Dimension {
    private double width;
    private double height;
}